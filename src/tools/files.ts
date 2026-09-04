import { readFileSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";
import { Type, type FunctionDeclaration } from "@google/genai";

// Racine autorisée : le dossier du projet lui-même. Aucun outil "fichiers"
// ne doit pouvoir sortir de ce dossier (pas d'accès à .env d'un autre projet,
// aux fichiers systeme, etc.). C'est LE garde-fou de tout ce fichier.
const PROJECT_ROOT = process.cwd();

// Vérifie qu'un chemin demandé par le LLM reste bien à l'intérieur du projet.
// Retourne le chemin absolu si OK, lève une erreur sinon.
function resolveSafePath(requestedPath: string): string {
  const absolute = resolve(PROJECT_ROOT, requestedPath);
  const rel = relative(PROJECT_ROOT, absolute);

  // Si le chemin relatif commence par ".." ou est lui-même absolu après le
  // calcul, ça veut dire qu'on est sorti du dossier du projet.
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(
      `Accès refusé : "${requestedPath}" est en dehors du dossier du projet.`
    );
  }
  return absolute;
}

export const readFileDeclaration: FunctionDeclaration = {
  name: "read_file",
  description:
    "Lit le contenu texte d'un fichier du projet. Le chemin doit être relatif à la racine du projet " +
    "(ex: 'src/index.ts'), jamais un chemin absolu ni un chemin en dehors du projet.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: {
        type: Type.STRING,
        description: "Chemin relatif du fichier à lire, ex: 'src/agent.ts'.",
      },
    },
    required: ["path"],
  },
};

export function runReadFile(args: { path: string }): string {
  try {
    const safePath = resolveSafePath(args.path);
    const content = readFileSync(safePath, "utf-8");
    return content;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `Erreur lors de la lecture de "${args.path}": ${message}`;
  }
}
