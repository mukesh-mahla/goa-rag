import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.gemini_api_key || process.env.GEMINI_API_KEY;
export const ai = new GoogleGenAI({ apiKey });

export async function getEmbedding(
  text: string,
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_QUERY"
): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
    config: {
      outputDimensionality: 768,
      taskType,
    },
  });

  const raw = response.embeddings?.[0]?.values || [];
  if (!raw.length) {
    throw new Error("No embedding returned from Gemini API");
  }

  // Normalize embedding vector to unit length (for cosine metric alignment)
  let sumSq = 0;
  for (let i = 0; i < raw.length; i++) {
    sumSq += raw[i] * raw[i];
  }
  const norm = Math.sqrt(sumSq);
  if (norm > 0) {
    return raw.map((v) => v / norm);
  }
  return raw;
}

// Alias for backward compatibility
export const getEmbeding = getEmbedding;
