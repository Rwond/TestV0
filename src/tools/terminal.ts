import { execSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import type OpenAI from "openai";

export const runCommandDeclaration: OpenAI.Chat.ChatCompletionTool = {
  type: "function",
  function: {
    name: "run_command",
    description:
      "Exécute une commande dans le terminal, dans le dossier du projet (ex: 'npm test', 'ls'). " +
      "Outil sensible : chaque commande demande une confirmation manuelle avant d'être réellement exécutée, " +
      "donc n'hésite pas à l'utiliser quand c'est pertinent — l'utilisateur garde le dernier mot.",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "La commande shell complète à exécuter, ex: 'npm test' ou 'ls -la src'.",
        },
      },
      required: ["command"],
    },
  },
};

// Demande une confirmation ligne par ligne (stdin). L'utilisateur peut taper
// "oui" au clavier, OU dicter "oui" à la voix avec la dictée Windows (Win+H) :
// dans les deux cas, ça arrive ici comme du texte tapé dans le terminal — le
// code n'a pas besoin de "comprendre" la voix, Windows s'en charge tout seul.
async function askConfirmation(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(question);
    const normalized = answer.trim().toLowerCase();
    return ["oui", "o", "yes", "y"].includes(normalized);
  } finally {
    rl.close();
  }
}

export async function runCommand(args: { command: string }): Promise<string> {
  if (!args.command || !args.command.trim()) {
    return "Erreur: aucune commande fournie.";
  }

  console.log(`\n[run_command] Le LLM veut exécuter : ${args.command}`);
  const confirmed = await askConfirmation('Confirmer ? (tape ou dis "oui" pour exécuter, autre chose pour refuser) : ');

  if (!confirmed) {
    return "Commande refusée par l'utilisateur — non exécutée.";
  }

  try {
    // execSync (pas execFileSync) : ici on veut justement pouvoir taper des
    // commandes shell complètes ("npm test", "ls -la | grep x"...), donc le
    // vrai garde-fou n'est pas technique mais humain (la confirmation ci-dessus).
    const output = execSync(args.command, {
      cwd: process.cwd(),
      encoding: "utf-8",
      timeout: 30_000, // 30s : évite qu'une commande interactive/infinie bloque l'agent indéfiniment
    });
    return output.trim() === "" ? "(aucune sortie)" : output;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `Erreur lors de l'exécution de la commande: ${message}`;
  }
}
