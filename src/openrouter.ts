import "dotenv/config";
import OpenAI from "openai";

// OpenRouter expose une API compatible OpenAI (mêmes formats de requête/réponse),
// juste avec une autre URL de base et sa propre clé. Le SDK "openai" fonctionne
// donc tel quel, sans rien de spécifique à écrire.
export const ai = new OpenAI({
  apiKey: process.env.GLM5_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// GLM-4.6 (Zhipu / Z.ai) via OpenRouter. C'est un modèle "raisonneur" : il
// consomme des tokens de réflexion avant de répondre, d'où un max_tokens
// généreux (voir agent.ts) pour ne pas couper la réponse en plein milieu.
export const MODEL = "z-ai/glm-4.6";
