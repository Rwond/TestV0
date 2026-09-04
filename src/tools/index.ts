import type { FunctionCall, FunctionDeclaration } from "@google/genai";
import { gitDiffDeclaration, runGitDiff, gitLogDeclaration, runGitLog } from "./git.js";
import { readFileDeclaration, runReadFile } from "./files.js";

// La liste des déclarations envoyées à Gemini à chaque appel.
// Ajouter un outil plus tard = l'ajouter ici.
export const toolDeclarations: FunctionDeclaration[] = [
  gitDiffDeclaration,
  gitLogDeclaration,
  readFileDeclaration,
];

// Le "dispatch" : à partir du nom demandé par Gemini, exécute la vraie fonction.
// C'est le seul endroit qui traduit "nom demandé par le LLM" -> "code réel exécuté".
export function executeTool(call: FunctionCall): string {
  switch (call.name) {
    case "git_diff":
      return runGitDiff((call.args ?? {}) as { cached?: boolean });
    case "git_log":
      return runGitLog((call.args ?? {}) as { count?: number });
    case "read_file":
      return runReadFile((call.args ?? {}) as { path: string });
    default:
      return `Erreur: outil inconnu "${call.name}"`;
  }
}
