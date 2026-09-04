import type OpenAI from "openai";
import { ai, MODEL } from "./gemini.js";
import { toolDeclarations, executeTool } from "./tools/index.js";

// Garde-fou : si jamais le LLM redemande des outils indéfiniment, on arrête
// après N allers-retours plutôt que de boucler à l'infini (et de payer/dépenser
// des appels API pour rien).
const MAX_TURNS = 5;

// Gemini est aussi un modèle "raisonneur" : il consomme des tokens de réflexion
// (invisibles dans la réponse) avant de répondre. Le tier gratuit n'a pas de
// souci de crédits (contrairement à OpenRouter avant), donc on peut rester généreux.
const MAX_TOKENS = 1024;

// OpenRouter (comme l'API OpenAI) répond parfois par une erreur transitoire en
// cas de forte demande sur le modèle. On réessaie quelques fois avec un court
// délai avant d'abandonner, plutôt que de planter direct.
async function chatWithRetry(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  retries = 2
): Promise<OpenAI.Chat.ChatCompletion> {
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await ai.chat.completions.create({
        model: MODEL,
        messages,
        tools: toolDeclarations,
        max_tokens: MAX_TOKENS,
      });
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const isRetryable = status === 503 || status === 429 || status === 500;
      const isLastAttempt = attempt === retries + 1;

      if (!isRetryable || isLastAttempt) throw err;

      console.log(`[agent] API indisponible (tentative ${attempt}/${retries + 1}), nouvel essai dans ${attempt}s...`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw new Error("chatWithRetry: aucune tentative n'a abouti");
}

export async function runAgent(userMessage: string): Promise<string> {
  // L'historique complet de la conversation. On le fait grossir à chaque tour.
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "user", content: userMessage },
  ];

  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    const response = await chatWithRetry(messages);
    const message = response.choices[0].message;

    // Cas de sortie : le LLM a répondu en texte, pas en demande d'outil.
    // La boucle s'arrête ici.
    if (!message.tool_calls || message.tool_calls.length === 0) {
      return message.content ?? "(réponse vide)";
    }

    console.log(
      `\n[agent] tour ${turn} : le LLM demande -> ${message.tool_calls.map((c) => c.function.name).join(", ")}`
    );

    // On rejoue exactement le tour "assistant" (texte éventuel + demandes
    // d'outils) dans l'historique, pour que le modèle se souvienne de ce
    // qu'il a demandé — l'API OpenAI l'exige tel quel avant les tool_result.
    messages.push(message);

    // On exécute réellement chaque outil demandé, et on ajoute chaque résultat
    // comme un message "tool" séparé (convention OpenAI, un par tool_call.id).
    for (const call of message.tool_calls) {
      const output = await executeTool(call.function.name, call.function.arguments);
      console.log(`[agent]   -> "${call.function.name}" a renvoyé ${output.length} caractères`);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: output,
      });
    }
  }

  return "(nombre maximum d'allers-retours atteint sans réponse finale)";
}
