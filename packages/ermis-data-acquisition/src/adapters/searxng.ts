import type { SearchProvider } from "../ports.js";
import type { SearchOptions, SearchResult } from "../types.js";
import { newRequestId } from "../util/hash.js";

export type SearxngProviderConfig = {
  baseUrl: string;
  fetchFn?: typeof fetch;
  language?: string;
};

type SearxngJsonResult = {
  results?: Array<{
    title?: string;
    url?: string;
    content?: string;
  }>;
};

export function createSearxngSearchProvider(config: SearxngProviderConfig): SearchProvider {
  const fetchFn = config.fetchFn ?? fetch;
  const searchBase = `${config.baseUrl.replace(/\/$/, "")}/search`;

  return {
    id: "searxng",
    async search(query: string, options?: SearchOptions): Promise<SearchResult> {
      const requestId = options?.correlationId ?? newRequestId("search");
      const retrievedAt = new Date().toISOString();
      const trimmed = query.trim();
      if (!trimmed) {
        return {
          requestId,
          query,
          retrievedAt,
          provider: "searxng",
          hits: [],
          outcome: "unsupported",
          warnings: ["empty_query"],
        };
      }

      const timeoutMs = options?.timeoutMs ?? 20_000;
      const maxResults = options?.maxResults ?? 10;
      const params = new URLSearchParams({
        q: trimmed,
        format: "json",
      });
      if (config.language) {
        params.set("language", config.language);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetchFn(`${searchBase}?${params.toString()}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        const raw = await res.text();
        if (!res.ok) {
          return {
            requestId,
            query: trimmed,
            retrievedAt,
            provider: "searxng",
            hits: [],
            outcome: "unavailable",
            warnings: [`searxng_http_${res.status}`, raw.slice(0, 200)],
          };
        }

        let payload: SearxngJsonResult;
        try {
          payload = JSON.parse(raw) as SearxngJsonResult;
        } catch {
          return {
            requestId,
            query: trimmed,
            retrievedAt,
            provider: "searxng",
            hits: [],
            outcome: "unavailable",
            warnings: ["searxng_invalid_json"],
          };
        }

        const hits = (payload.results ?? [])
          .slice(0, maxResults)
          .map((row) => ({
            title: row.title?.trim() || row.url || "",
            url: row.url?.trim() || "",
            snippet: row.content?.trim() || "",
          }))
          .filter((hit) => hit.url);

        return {
          requestId,
          query: trimmed,
          retrievedAt,
          provider: "searxng",
          hits,
          outcome: hits.length ? "success" : "partial",
          warnings: hits.length ? [] : ["searxng_no_results"],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "searxng_fetch_failed";
        return {
          requestId,
          query: trimmed,
          retrievedAt,
          provider: "searxng",
          hits: [],
          outcome: "unavailable",
          warnings: [message],
        };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
