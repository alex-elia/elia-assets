import { resolvePageReader, type EdaClientConfig } from "./config.js";
import type { EdaHooks, SearchProvider } from "./ports.js";
import type { AcquiredSource, ReadOptions, SearchOptions, SearchResult } from "./types.js";
import { newRequestId } from "./util/hash.js";

export type EdaClient = {
  read(url: string, options?: ReadOptions): Promise<AcquiredSource>;
  search(query: string, options?: SearchOptions): Promise<SearchResult>;
  readonly readerId: string;
  readonly searchProviderId: string | null;
};

export function createEdaClient(config: EdaClientConfig): EdaClient {
  const reader = resolvePageReader(config);
  const search: SearchProvider | null = config.search ?? null;
  const hooks: EdaHooks = config.hooks ?? {};

  return {
    readerId: reader.id,
    searchProviderId: search?.id ?? null,

    async read(url: string, options?: ReadOptions): Promise<AcquiredSource> {
      const correlationId = options?.correlationId ?? newRequestId("read");
      const started = Date.now();
      if (hooks.checkBudget) {
        await hooks.checkBudget({ kind: "read", correlationId });
      }
      const result = await reader.read(url, { ...options, correlationId });
      hooks.emitTelemetry?.({
        kind: "read",
        correlationId,
        provider: result.provider,
        outcome: result.outcome,
        durationMs: Date.now() - started,
        requestedUrl: result.requestedUrl,
      });
      return result;
    },

    async search(query: string, options?: SearchOptions): Promise<SearchResult> {
      const correlationId = options?.correlationId ?? newRequestId("search");
      const started = Date.now();
      if (!search) {
        const empty: SearchResult = {
          requestId: correlationId,
          query,
          retrievedAt: new Date().toISOString(),
          provider: "none",
          hits: [],
          outcome: "unsupported",
          warnings: ["search_provider_not_configured"],
        };
        hooks.emitTelemetry?.({
          kind: "search",
          correlationId,
          provider: "none",
          outcome: empty.outcome,
          durationMs: Date.now() - started,
          query,
        });
        return empty;
      }
      if (hooks.checkBudget) {
        await hooks.checkBudget({ kind: "search", correlationId });
      }
      const result = await search.search(query, { ...options, correlationId });
      hooks.emitTelemetry?.({
        kind: "search",
        correlationId,
        provider: result.provider,
        outcome: result.outcome,
        durationMs: Date.now() - started,
        query,
      });
      return result;
    },
  };
}
