import { execFileSync } from "node:child_process";
import type OpenAI from "openai";

// Ceci ne fait qu'une chose : DÉCRIRE l'outil au LLM (format OpenAI "tool calling",
// utilisé par OpenRouter). Ça ne contient encore aucun code qui exécute "git diff".
export const gitDiffDeclaration: OpenAI.Chat.ChatCompletionTool = {
  type: "function",
  function: {
    name: "git_diff",
    description:
      "Affiche les différences (diff) non commitées du dépôt git courant. " +
      "Utilise cet outil pour voir ce qui a changé dans le code avant de proposer un résumé ou un message de commit.",
    parameters: {
      type: "object",
      properties: {
        cached: {
          type: "boolean",
          description:
            "true = montre les changements déjà ajoutés avec 'git add' (staged). " +
            "false = montre les changements non ajoutés (unstaged). Par défaut: false.",
        },
      },
    },
  },
};

// Ceci, en revanche, EXÉCUTE réellement la commande git.
// C'est le seul endroit du projet qui touche vraiment au disque/à git.
export function runGitDiff(args: { cached?: boolean }): string {
  const gitArgs = ["diff"];
  if (args.cached) gitArgs.push("--cached");

  try {
    // execFileSync (et pas exec/execSync avec une string) : on passe les
    // arguments comme un tableau, pas comme une chaîne shell -> pas de risque
    // d'injection de commande même si "args" venait d'une source non fiable.
    const output = execFileSync("git", gitArgs, {
      cwd: process.cwd(),
      encoding: "utf-8",
    });
    return output.trim() === "" ? "(aucune modification détectée)" : output;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `Erreur lors de l'exécution de git diff: ${message}`;
  }
}

// Même schéma que gitDiffDeclaration : décrire l'outil, pas encore l'exécuter.
export const gitLogDeclaration: OpenAI.Chat.ChatCompletionTool = {
  type: "function",
  function: {
    name: "git_log",
    description:
      "Liste les derniers commits du dépôt git courant (hash court + message), du plus récent au plus ancien. " +
      "Utilise cet outil pour résumer l'historique récent des commits.",
    parameters: {
      type: "object",
      properties: {
        count: {
          type: "number",
          description: "Nombre de commits à afficher. Par défaut: 5.",
        },
      },
    },
  },
};

export function runGitLog(args: { count?: number }): string {
  // On clamp le nombre pour éviter un input absurde (0, négatif, énorme...),
  // même si args vient d'un LLM en principe "de confiance" ici.
  const count = Math.min(Math.max(args.count ?? 5, 1), 50);
  const gitArgs = ["log", `-n`, String(count), "--oneline"];

  try {
    const output = execFileSync("git", gitArgs, {
      cwd: process.cwd(),
      encoding: "utf-8",
    });
    return output.trim() === "" ? "(aucun commit trouvé)" : output;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `Erreur lors de l'exécution de git log: ${message}`;
  }
}
