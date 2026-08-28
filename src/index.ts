import { ai, MODEL } from "./gemini.js";
import { gitDiffDeclaration } from "./tools/git.js";

async function main() {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: "Analyse les modifications de mon projet et propose-moi un message de commit.",
    config: {
      tools: [{ functionDeclarations: [gitDiffDeclaration] }],
    },
  });

  console.log("--- Texte de la réponse ---");
  console.log(response.text ?? "(aucun texte, Gemini a préféré demander un outil)");

  console.log("\n--- Appels d'outils demandés ---");
  console.log(response.functionCalls ?? "(aucun)");
}

main();
