import { execFileSync } from "node:child_process";
import { Type, type FunctionDeclaration } from "@google/genai";

// Ceci ne fait qu'une chose : DÉCRIRE l'outil à Gemini.
// Ça ne contient encore aucun code qui exécute réellement "git diff".
export const gitDiffDeclaration: FunctionDeclaration = {
  name: "git_diff",
  description:
    "Affiche les différences (diff) non commitées du dépôt git courant. " +
    "Utilise cet outil pour voir ce qui a changé dans le code avant de proposer un résumé ou un message de commit.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      cached: {
        type: Type.BOOLEAN,
        description:
          "true = montre les changements déjà ajoutés avec 'git add' (staged). " +
          "false = montre les changements non ajoutés (unstaged). Par défaut: false.",
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
