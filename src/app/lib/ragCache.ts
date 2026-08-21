/**
 * In-Memory Ultra-Low Latency Semantic & Vector Cache
 * Enables sub-200ms end-to-end RAG response times by caching
 * query embeddings, vector retrieval results, and verified answers.
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

class FastLRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxEntries: number;
  private ttlMs: number;

  constructor(maxEntries = 500, ttlMs = 1000 * 60 * 60) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
  }

  get(key: string): T | null {
    const normalizedKey = key.trim().toLowerCase();
    const entry = this.cache.get(normalizedKey);

    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(normalizedKey);
      return null;
    }

    // Refresh LRU position
    this.cache.delete(normalizedKey);
    this.cache.set(normalizedKey, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    const normalizedKey = key.trim().toLowerCase();

    if (this.cache.size >= this.maxEntries) {
      // Remove oldest key
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(normalizedKey, {
      value,
      timestamp: Date.now(),
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global Singletons for In-Memory Caching (Vercel Serverless Warm Instances & Local Server)
export const queryEmbeddingCache = new FastLRUCache<number[]>(1000, 1000 * 60 * 120);
export const vectorRetrievalCache = new FastLRUCache<any[]>(1000, 1000 * 60 * 120);
export const fastRagOutputCache = new FastLRUCache<any>(1000, 1000 * 60 * 120);
