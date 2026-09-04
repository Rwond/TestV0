import { createInterface } from "node:readline/promises";

// Une seule interface readline pour tout le process, partagée entre la boucle
// de dialogue (index.ts) et la confirmation de run_command (tools/terminal.ts).
// Avoir deux interfaces readline actives en même temps sur le même stdin peut
// causer des comportements imprévisibles (entrée "mangée" par la mauvaise, etc.).
export const rl = createInterface({ input: process.stdin, output: process.stdout });
