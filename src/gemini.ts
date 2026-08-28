import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

// Le client officiel Google GenAI. Il lit ta clé explicitement (pas de
// détection automatique de variable d'env comme chez Anthropic).
export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Modèle gratuit (tier gratuit Google AI Studio), déjà utilisé dans MyBiblioAI.
export const MODEL = "gemini-flash-lite-latest";
