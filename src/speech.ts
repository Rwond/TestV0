import { writeFileSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Fait parler l'agent avec la synthèse vocale déjà intégrée à Windows (SAPI),
// sans dépendance ni service externe — même philosophie que Win+H pour la
// confirmation : on s'appuie sur ce que l'OS sait déjà faire.
//
// Le texte est écrit dans un fichier temporaire plutôt qu'injecté directement
// dans la commande PowerShell : ça évite tout risque d'échappement foireux ou
// d'injection si la réponse du LLM contient des guillemets, des $, etc.
export function speak(text: string): void {
  if (!text || process.platform !== "win32") return;

  const tmpFile = join(tmpdir(), `hometaskai-speak-${Date.now()}.txt`);
  writeFileSync(tmpFile, text, "utf-8");

  try {
    execFileSync("powershell", [
      "-NoProfile",
      "-Command",
      "Add-Type -AssemblyName System.Speech; " +
        "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; " +
        `$s.Speak([IO.File]::ReadAllText('${tmpFile}'))`,
    ]);
  } catch (err) {
    // La voix est un bonus, pas une fonctionnalité critique : si ça échoue
    // (pas de voix installée, PowerShell restreint, etc.), on continue sans
    // bloquer la conversation — juste un avertissement dans la console.
    console.log("[voix] Synthèse vocale indisponible :", err instanceof Error ? err.message : err);
  } finally {
    try {
      unlinkSync(tmpFile);
    } catch {
      // Le fichier temporaire est sans conséquence s'il n'est pas nettoyé.
    }
  }
}
