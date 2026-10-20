import { PGVECTOR_DIMENSIONS } from "./constants.js";

/**
 * Normalize embedding length for pgvector(1536). BGE-M3 returns 1024; pad with zeros.
 */
export function normalizeEmbeddingForPgvector(
  vector: number[],
  targetDim: number = PGVECTOR_DIMENSIONS,
): number[] {
  if (vector.length === targetDim) {
    return vector;
  }
  if (vector.length === 1024 && targetDim === 1536) {
    return [...vector, ...Array(512).fill(0)];
  }
  if (vector.length > targetDim) {
    return vector.slice(0, targetDim);
  }
  return [...vector, ...Array(targetDim - vector.length).fill(0)];
}
