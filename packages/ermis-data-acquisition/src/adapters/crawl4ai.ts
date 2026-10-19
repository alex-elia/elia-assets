import type { PageReader } from "../ports.js";
import type { AcquiredSource, ReadOptions } from "../types.js";
import { normalizeHttpUrl } from "../policy/url.js";
import { newRequestId, sha256Hex } from "../util/hash.js";

const EXTRACTOR_VERSION = "crawl4ai-http-v1";

export type Crawl4AiReaderConfig = {
  baseUrl: string;
  apiToken?: string;
  fetchFn?: typeof fetch;
};

type Crawl4AiResult = {
  url?: string;
  success?: boolean;
  markdown?: string;
  cleaned_html?: string;
  html?: string;
  error_message?: string;
  metadata?: { title?: string };
};

function pickMarkdown(result: Crawl4AiResult): string {
  if (typeof result.markdown === "string" && result.markdown.trim()) {
    return result.markdown;
  }
  if (typeof result.cleaned_html === "string" && result.cleaned_html.trim()) {
    return result.cleaned_html;
  }
  return "";
}

export function createCrawl4AiPageReader(config: Crawl4AiReaderConfig): PageReader {
  const fetchFn = config.fetchFn ?? fetch;
  const crawlEndpoint = `${config.baseUrl.replace(/\/$/, "")}/crawl`;

  return {
    id: "crawl4ai",
    version: EXTRACTOR_VERSION,
    async read(url: string, options?: ReadOptions): Promise<AcquiredSource> {
      const requestId = options?.correlationId ?? newRequestId("read");
      const validated = normalizeHttpUrl(url);
      const retrievedAt = new Date().toISOString();

      if (!validated.ok) {
        return {
          requestId,
          requestedUrl: url,
          finalUrl: url,
          retrievedAt,
          contentType: "text/markdown",
          markdown: "",
          contentHash: sha256Hex(""),
          provider: "crawl4ai",
          extractorVersion: EXTRACTOR_VERSION,
          outcome:
            validated.reason === "blocked_host" || validated.reason === "private_network"
              ? "blocked"
              : "unsupported",
          warnings: [validated.reason],
        };
      }

      const normalized = validated.normalized;
      const timeoutMs = options?.timeoutMs ?? 60_000;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetchFn(crawlEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(config.apiToken ? { Authorization: `Bearer ${config.apiToken}` } : {}),
          },
          body: JSON.stringify({
            urls: [normalized],
            priority: 5,
          }),
          signal: controller.signal,
        });

        const raw = await res.text();
        if (!res.ok) {
          return {
            requestId,
            requestedUrl: url,
            finalUrl: normalized,
            retrievedAt,
            contentType: "text/markdown",
            markdown: "",
            contentHash: sha256Hex(""),
            provider: "crawl4ai",
            extractorVersion: EXTRACTOR_VERSION,
            outcome: "unavailable",
            warnings: [`crawl4ai_http_${res.status}`, raw.slice(0, 200)],
          };
        }

        let payload: unknown;
        try {
          payload = JSON.parse(raw) as unknown;
        } catch {
          return {
            requestId,
            requestedUrl: url,
            finalUrl: normalized,
            retrievedAt,
            contentType: "text/markdown",
            markdown: "",
            contentHash: sha256Hex(""),
            provider: "crawl4ai",
            extractorVersion: EXTRACTOR_VERSION,
            outcome: "unavailable",
            warnings: ["crawl4ai_invalid_json"],
          };
        }

        const results = extractResults(payload);
        const first = results[0];
        if (!first) {
          return {
            requestId,
            requestedUrl: url,
            finalUrl: normalized,
            retrievedAt,
            contentType: "text/markdown",
            markdown: "",
            contentHash: sha256Hex(""),
            provider: "crawl4ai",
            extractorVersion: EXTRACTOR_VERSION,
            outcome: "unavailable",
            warnings: ["crawl4ai_empty_results"],
          };
        }

        let markdown = pickMarkdown(first);
        const maxBytes = options?.maxBytes ?? 2_000_000;
        if (markdown.length > maxBytes) {
          markdown = markdown.slice(0, maxBytes);
        }

        const finalUrl = typeof first.url === "string" ? first.url : normalized;
        const warnings: string[] = [];
        if (first.error_message) {
          warnings.push(first.error_message);
        }
        if (first.success === false && !markdown.trim()) {
          return {
            requestId,
            requestedUrl: url,
            finalUrl,
            retrievedAt,
            contentType: "text/markdown",
            markdown: "",
            contentHash: sha256Hex(""),
            provider: "crawl4ai",
            extractorVersion: EXTRACTOR_VERSION,
            outcome: "unavailable",
            warnings,
          };
        }

        const outcome = markdown.trim() ? (warnings.length ? "partial" : "success") : "partial";
        return {
          requestId,
          requestedUrl: url,
          finalUrl,
          retrievedAt,
          contentType: "text/markdown",
          markdown,
          contentHash: sha256Hex(markdown),
          provider: "crawl4ai",
          extractorVersion: EXTRACTOR_VERSION,
          outcome,
          warnings,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "crawl4ai_fetch_failed";
        return {
          requestId,
          requestedUrl: url,
          finalUrl: normalized,
          retrievedAt,
          contentType: "text/markdown",
          markdown: "",
          contentHash: sha256Hex(""),
          provider: "crawl4ai",
          extractorVersion: EXTRACTOR_VERSION,
          outcome: "unavailable",
          warnings: [message],
        };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

function extractResults(payload: unknown): Crawl4AiResult[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.results)) {
    return record.results as Crawl4AiResult[];
  }
  if (record.result && typeof record.result === "object") {
    return [record.result as Crawl4AiResult];
  }
  return [];
}
