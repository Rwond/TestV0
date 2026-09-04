import { runAgent } from "./agent.js";

async function main() {
  // Permet: npm start -- "Analyse mes changements..."
  // Sinon utilise la phrase d'exemple de v0.md par défaut.
  const userMessage =
    process.argv[2] ??
    "Analyse les modifications de mon projet et propose-moi un message de commit.";

  console.log(`> ${userMessage}`);

  try {
    const answer = await runAgent(userMessage);
    console.log("\n=== Réponse finale ===");
    console.log(answer);
  } catch (err) {
    // Après toutes les tentatives de chatWithRetry, on affiche un message
    // compréhensible plutôt qu'une stack trace brute qui plante le process.
    const message = err instanceof Error ? err.message : String(err);
    console.error("\n=== Erreur ===");
    console.error(`L'agent n'a pas pu obtenir de réponse du modèle : ${message}`);
    process.exitCode = 1;
  }
}

main();
