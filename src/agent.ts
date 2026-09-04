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

// Une "session" garde l'historique complet de la conversation en mémoire
// (dans la fermeture de send()) d'un appel à l'autre — indispensable pour un
// vrai dialogue en boucle (REPL) où chaque message doit se souvenir des
// précédents. Cette mémoire ne vit que le temps du process (rien sur disque).
export function createAgentSession() {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  async function send(userMessage: string): Promise<string> {
    messages.push({ role: "user", content: userMessage });
    return runTurns();
  }

  async function runTurns(): Promise<string> {
    for (let turn = 1; turn <= MAX_TURNS; turn++) {
      const response = await chatWithRetry(messages);
      const message = response.choices[0].message;

      if (!message.tool_calls || message.tool_calls.length === 0) {
        messages.push(message); // garde la réponse finale dans l'historique aussi
        return message.content ?? "(réponse vide)";
      }

      console.log(
        `\n[agent] tour ${turn} : le LLM demande -> ${message.tool_calls.map((c) => c.function.name).join(", ")}`
      );

      messages.push(message);

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

  return { send };
}

// Conservé pour compatibilité (usage ponctuel, une seule question) : crée une
// session à usage unique. Le REPL, lui, utilise createAgentSession() directement.
export async function runAgent(userMessage: string): Promise<string> {
  return createAgentSession().send(userMessage);
}
