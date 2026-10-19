import type {
  AcquiredSource,
  ReadOptions,
  SearchHit,
  SearchOptions,
  SearchResult,
} from "./types.js";

export type SearchProvider = {
  readonly id: string;
  search(query: string, options?: SearchOptions): Promise<SearchResult>;
};

export type PageReader = {
  readonly id: string;
  readonly version: string;
  read(url: string, options?: ReadOptions): Promise<AcquiredSource>;
};

export type EdaTelemetryEvent = {
  kind: "read" | "search";
  correlationId: string;
  provider: string;
  outcome: string;
  durationMs: number;
  requestedUrl?: string;
  query?: string;
};

export type EdaHooks = {
  checkBudget?: (ctx: { kind: "read" | "search"; correlationId: string }) => Promise<void>;
  emitTelemetry?: (event: EdaTelemetryEvent) => void;
};

export type { SearchHit };
