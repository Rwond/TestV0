import type { Content, GenerateContentParameters } from "@google/genai";
import { ai, MODEL } from "./gemini.js";
import { toolDeclarations, executeTool } from "./tools/index.js";

// Garde-fou : si jamais Gemini redemande des outils indéfiniment, on arrête
// après N allers-retours plutôt que de boucler à l'infini (et de payer/dépenser
// des appels API pour rien).
const MAX_TURNS = 5;

// L'API Gemini (surtout le tier gratuit) répond parfois "503 UNAVAILABLE" en cas
// de forte demande — une erreur transitoire, pas un bug. On réessaie quelques
// fois avec un court délai avant d'abandonner, plutôt que de planter direct.
async function generateWithRetry(params: GenerateContentParameters, retries = 2) {
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const isRetryable = status === 503 || status === 429;
      const isLastAttempt = attempt === retries + 1;

      if (!isRetryable || isLastAttempt) throw err;

      console.log(`[agent] API Gemini indisponible (tentative ${attempt}/${retries + 1}), nouvel essai dans ${attempt}s...`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  // Inatteignable (la boucle throw ou return à chaque itération), mais TypeScript
  // veut une valeur de retour explicite sur tous les chemins.
  throw new Error("generateWithRetry: aucune tentative n'a abouti");
}

export async function runAgent(userMessage: string): Promise<string> {
  // L'historique complet de la conversation. On le fait grossir à chaque tour.
  const contents: Content[] = [{ role: "user", parts: [{ text: userMessage }] }];

  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    const response = await generateWithRetry({
      model: MODEL,
      contents,
      config: { tools: [{ functionDeclarations: toolDeclarations }] },
    });

    const calls = response.functionCalls;

    // Cas de sortie : Gemini a répondu en texte, pas en demande d'outil.
    // La boucle s'arrête ici.
    if (!calls || calls.length === 0) {
      return response.text ?? "(réponse vide)";
    }

    console.log(
      `\n[agent] tour ${turn} : Gemini demande -> ${calls.map((c) => c.name).join(", ")}`
    );

    // On rejoue exactement le tour "model" (texte éventuel + demandes d'outils)
    // dans l'historique, pour que Gemini se souvienne de ce qu'il a demandé.
    const modelParts = response.candidates?.[0]?.content?.parts ?? [];
    contents.push({ role: "model", parts: modelParts });

    // On exécute réellement chaque outil demandé, et on construit les résultats.
    const resultParts = calls.map((call) => {
      const output = executeTool(call);
      console.log(`[agent]   -> "${call.name}" a renvoyé ${output.length} caractères`);
      return {
        functionResponse: {
          name: call.name,
          response: { output },
        },
      };
    });

    // Les résultats sont renvoyés comme un tour "user" (convention de l'API Gemini
    // pour les functionResponse), pour que Gemini les lise au prochain appel.
    contents.push({ role: "user", parts: resultParts });
  }

  return "(nombre maximum d'allers-retours atteint sans réponse finale)";
}
