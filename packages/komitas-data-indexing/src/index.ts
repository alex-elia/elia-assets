export {
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_MAX_CHUNKS,
  DEFAULT_CHUNK_VERSION,
  DEFAULT_EMBEDDING_VERSION,
  PGVECTOR_DIMENSIONS,
} from "./constants.js";

export { chunkText, type TextChunk, type ChunkTextOptions } from "./chunking.js";

export {
  normalizeEmbeddingForPgvector,
} from "./vector-dimensions.js";

export {
  type EmbeddingProvider,
  resolveEmbeddingModelForProvider,
} from "./embedding-model.js";

export {
  type EmbeddingEnv,
  type EmbeddingResult,
  createNodeEmbeddingEnv,
  detectEmbeddingProvider,
  generateEmbedding,
  generateEmbeddings,
  getDefaultEmbeddingModel,
} from "./embeddings.js";

export {
  type KdiSearchHit,
  type KdiSearchParams,
  type RpcCaller,
  type VectorIndex,
  type SupabasePgVectorAdapterOptions,
  createSupabasePgVectorAdapter,
} from "./vector-index.js";
