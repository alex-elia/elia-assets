export { createEdaClient, type EdaClient } from "./client.js";
export { createCrawl4AiPageReader, type Crawl4AiReaderConfig } from "./adapters/crawl4ai.js";
export { createJinaPageReader, type JinaReaderConfig } from "./adapters/jina.js";
export { normalizeHttpUrl, type UrlValidationResult } from "./policy/url.js";
export type {
  AcquiredSource,
  AcquisitionOutcome,
  ReadOptions,
  SearchHit,
  SearchOptions,
  SearchResult,
} from "./types.js";
export type {
  EdaHooks,
  EdaTelemetryEvent,
  PageReader,
  SearchProvider,
} from "./ports.js";
export { resolvePageReader, type EdaClientConfig, type ReaderKind } from "./config.js";
