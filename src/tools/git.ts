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
