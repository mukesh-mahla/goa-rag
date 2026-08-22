import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.gemini_api_key || process.env.GEMINI_API_KEY;
export const ai = new GoogleGenAI({ apiKey });

// In-memory LRU embedding cache for sub-millisecond retrieval on common queries
const embeddingCache = new Map<string, number[]>();

export async function getEmbedding(
  text: string,
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_QUERY"
): Promise<number[]> {
  const cacheKey = `${taskType}:${text.trim().toLowerCase()}`;
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }

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
  let normalized = raw;
  if (norm > 0) {
    normalized = raw.map((v) => v / norm);
  }

  // Cache normalized vector (limit cache size to 500 entries)
  if (embeddingCache.size > 500) {
    const firstKey = embeddingCache.keys().next().value;
    if (firstKey) embeddingCache.delete(firstKey);
  }
  embeddingCache.set(cacheKey, normalized);

  return normalized;
}

// Alias for backward compatibility
export const getEmbeding = getEmbedding;
