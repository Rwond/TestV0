import type { Content } from "@google/genai";
import { ai, MODEL } from "./gemini.js";
import { toolDeclarations, executeTool } from "./tools/index.js";

// Garde-fou : si jamais Gemini redemande des outils indéfiniment, on arrête
// après N allers-retours plutôt que de boucler à l'infini (et de payer/dépenser
// des appels API pour rien).
const MAX_TURNS = 5;

export async function runAgent(userMessage: string): Promise<string> {
  // L'historique complet de la conversation. On le fait grossir à chaque tour.
  const contents: Content[] = [{ role: "user", parts: [{ text: userMessage }] }];

  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    const response = await ai.models.generateContent({
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
