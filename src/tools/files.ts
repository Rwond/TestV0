import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from "node:fs";
import { resolve, relative, isAbsolute, dirname } from "node:path";
import type OpenAI from "openai";

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

export const readFileDeclaration: OpenAI.Chat.ChatCompletionTool = {
  type: "function",
  function: {
    name: "read_file",
    description:
      "Lit le contenu texte d'un fichier du projet. Le chemin doit être relatif à la racine du projet " +
      "(ex: 'src/index.ts'), jamais un chemin absolu ni un chemin en dehors du projet.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Chemin relatif du fichier à lire, ex: 'src/agent.ts'.",
        },
      },
      required: ["path"],
    },
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

export const listDirDeclaration: OpenAI.Chat.ChatCompletionTool = {
  type: "function",
  function: {
    name: "list_dir",
    description:
      "Liste les fichiers et dossiers à un chemin donné du projet (non récursif). " +
      "Chemin relatif à la racine du projet, ex: 'src' ou '.' pour la racine.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Chemin relatif du dossier à lister. Par défaut: '.' (racine du projet).",
        },
      },
    },
  },
};

export function runListDir(args: { path?: string }): string {
  try {
    const safePath = resolveSafePath(args.path ?? ".");
    const entries = readdirSync(safePath).map((name) => {
      const isDir = statSync(resolve(safePath, name)).isDirectory();
      return isDir ? `${name}/` : name;
    });
    return entries.length === 0 ? "(dossier vide)" : entries.join("\n");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `Erreur lors du listage de "${args.path ?? "."}": ${message}`;
  }
}

export const writeFileDeclaration: OpenAI.Chat.ChatCompletionTool = {
  type: "function",
  function: {
    name: "write_file",
    description:
      "Crée ou remplace un fichier texte dans le projet. Par sécurité, refuse d'écraser un fichier déjà " +
      "existant sauf si 'overwrite' vaut true — pour ne jamais perdre un fichier par erreur.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Chemin relatif du fichier à écrire, ex: 'notes/idee.md'.",
        },
        content: {
          type: "string",
          description: "Contenu texte complet à écrire dans le fichier.",
        },
        overwrite: {
          type: "boolean",
          description: "true pour autoriser le remplacement d'un fichier déjà existant. Par défaut: false.",
        },
      },
      required: ["path", "content"],
    },
  },
};

export function runWriteFile(args: { path: string; content: string; overwrite?: boolean }): string {
  try {
    const safePath = resolveSafePath(args.path);

    if (existsSync(safePath) && !args.overwrite) {
      return (
        `Refusé : "${args.path}" existe déjà. Relance l'outil avec overwrite: true ` +
        `si tu veux vraiment le remplacer.`
      );
    }

    // writeFileSync ne crée pas les dossiers parents manquants tout seul —
    // on le fait explicitement (ex: "notes/idee.md" alors que "notes/" n'existe pas encore).
    mkdirSync(dirname(safePath), { recursive: true });
    writeFileSync(safePath, args.content, "utf-8");
    return `Fichier "${args.path}" écrit avec succès (${args.content.length} caractères).`;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `Erreur lors de l'écriture de "${args.path}": ${message}`;
  }
}
