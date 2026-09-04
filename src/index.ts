import { rl } from "./cli.js";
import { createAgentSession } from "./agent.js";
import { speak } from "./speech.js";

const EXIT_WORDS = ["exit", "quit", "stop", "au revoir", "bye"];

async function main() {
  console.log("=== HomeTaskAI ===");
  console.log('Dialogue en continu : écris ou dicte (Win+H) ton message. Tape "exit" pour quitter.');

  const session = createAgentSession();

  // Si un message est passé en argument (npm start -- "..."), on y répond
  // d'abord, puis on enchaîne directement sur la conversation en continu —
  // pas besoin de choisir entre "une question rapide" et "un vrai dialogue".
  const firstMessage = process.argv[2];
  if (firstMessage) {
    await handleMessage(firstMessage);
  }

  while (true) {
    let raw: string;
    try {
      raw = await rl.question("\nToi : ");
    } catch {
      // stdin fermé (Ctrl+D, ou fin d'un flux non-interactif) -> on sort
      // proprement plutôt que de planter avec ERR_USE_AFTER_CLOSE.
      break;
    }

    const input = raw.trim();
    if (!input) continue;
    if (EXIT_WORDS.includes(input.toLowerCase())) break;

    await handleMessage(input);
  }

  console.log("\nÀ bientôt !");
  if (!rl.closed) rl.close();

  async function handleMessage(userMessage: string) {
    try {
      const answer = await session.send(userMessage);
      console.log(`\nAgent : ${answer}`);
      speak(answer);
    } catch (err) {
      // Après toutes les tentatives de chatWithRetry, on affiche un message
      // compréhensible plutôt qu'une stack trace brute qui plante le process.
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n[Erreur] L'agent n'a pas pu répondre : ${message}`);
    }
  }
}

main();
