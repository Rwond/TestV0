import type { FunctionCall, FunctionDeclaration } from "@google/genai";
import { gitDiffDeclaration, runGitDiff } from "./git.js";

// La liste des déclarations envoyées à Gemini à chaque appel.
// Ajouter un outil plus tard = l'ajouter ici.
export const toolDeclarations: FunctionDeclaration[] = [gitDiffDeclaration];

// Le "dispatch" : à partir du nom demandé par Gemini, exécute la vraie fonction.
// C'est le seul endroit qui traduit "nom demandé par le LLM" -> "code réel exécuté".
export function executeTool(call: FunctionCall): string {
  switch (call.name) {
    case "git_diff":
      return runGitDiff((call.args ?? {}) as { cached?: boolean });
    default:
      return `Erreur: outil inconnu "${call.name}"`;
  }
}
