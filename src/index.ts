import { runAgent } from "./agent.js";

async function main() {
  // Permet: npm start -- "Analyse mes changements..."
  // Sinon utilise la phrase d'exemple de v0.md par défaut.
  const userMessage =
    process.argv[2] ??
    "Analyse les modifications de mon projet et propose-moi un message de commit.";

  console.log(`> ${userMessage}`);

  const answer = await runAgent(userMessage);

  console.log("\n=== Réponse finale ===");
  console.log(answer);
}

main();
