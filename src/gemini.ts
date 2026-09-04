import "dotenv/config";
import OpenAI from "openai";

// Google expose Gemini via une API compatible OpenAI (mêmes formats de
// requête/réponse) — on garde donc le même SDK "openai" et le même code
// agent.ts qu'avec OpenRouter, seuls le client et le modèle changent.
export const ai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

// Modèle gratuit (tier gratuit Google AI Studio). "gemini-2.0-flash" est
// retiré ; Google recommande gemini-3.6-flash comme remplaçant actuel.
export const MODEL = "gemini-3.6-flash";
