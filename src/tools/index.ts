import type OpenAI from "openai";
import { gitDiffDeclaration, runGitDiff, gitLogDeclaration, runGitLog } from "./git.js";
import {
  readFileDeclaration,
  runReadFile,
  listDirDeclaration,
  runListDir,
  writeFileDeclaration,
  runWriteFile,
} from "./files.js";

// La liste des déclarations envoyées au LLM à chaque appel.
// Ajouter un outil plus tard = l'ajouter ici.
export const toolDeclarations: OpenAI.Chat.ChatCompletionTool[] = [
  gitDiffDeclaration,
  gitLogDeclaration,
  readFileDeclaration,
  listDirDeclaration,
  writeFileDeclaration,
];

// Le "dispatch" : à partir du nom + des arguments JSON demandés par le LLM,
// exécute la vraie fonction. Seul endroit qui traduit "nom demandé" -> "code réel".
export function executeTool(name: string, argsJson: string): string {
  let args: Record<string, unknown>;
  try {
    args = argsJson ? JSON.parse(argsJson) : {};
  } catch {
    return `Erreur: arguments invalides (JSON illisible) pour "${name}".`;
  }

  switch (name) {
    case "git_diff":
      return runGitDiff(args as { cached?: boolean });
    case "git_log":
      return runGitLog(args as { count?: number });
    case "read_file":
      return runReadFile(args as { path: string });
    case "list_dir":
      return runListDir(args as { path?: string });
    case "write_file":
      return runWriteFile(args as { path: string; content: string; overwrite?: boolean });
    default:
      return `Erreur: outil inconnu "${name}"`;
  }
}
