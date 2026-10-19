import type { PageReader } from "../ports.js";
import type { AcquiredSource, ReadOptions } from "../types.js";
import { normalizeHttpUrl } from "../policy/url.js";
import { newRequestId, sha256Hex } from "../util/hash.js";

const JINA_READER_BASE = "https://r.jina.ai/";
const EXTRACTOR_VERSION = "jina-reader-v1";

export type JinaReaderConfig = {
  apiKey?: string;
  fetchFn?: typeof fetch;
};

export function createJinaPageReader(config: JinaReaderConfig = {}): PageReader {
  const fetchFn = config.fetchFn ?? fetch;

  return {
    id: "jina",
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
          provider: "jina",
          extractorVersion: EXTRACTOR_VERSION,
          outcome: validated.reason === "blocked_host" || validated.reason === "private_network"
            ? "blocked"
            : "unsupported",
          warnings: [validated.reason],
        };
      }

      const normalized = validated.normalized;
      const jinaUrl = `${JINA_READER_BASE}${normalized}`;
      const timeoutMs = options?.timeoutMs ?? 30_000;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetchFn(jinaUrl, {
          method: "GET",
          headers: {
            Accept: "text/markdown",
            "X-Return-Format": "markdown",
            "X-Timeout": String(Math.min(60, Math.ceil(timeoutMs / 1000))),
            ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
          },
          redirect: "follow",
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          const outcome = res.status === 429 ? "unavailable" : "unavailable";
          return {
            requestId,
            requestedUrl: url,
            finalUrl: normalized,
            retrievedAt,
            contentType: "text/markdown",
            markdown: "",
            contentHash: sha256Hex(""),
            provider: "jina",
            extractorVersion: EXTRACTOR_VERSION,
            outcome,
            warnings: [`jina_http_${res.status}`, text.slice(0, 200)],
          };
        }

        let markdown = await res.text();
        const maxBytes = options?.maxBytes ?? 2_000_000;
        if (markdown.length > maxBytes) {
          markdown = markdown.slice(0, maxBytes);
        }

        const outcome = markdown.trim() ? "success" : "partial";
        return {
          requestId,
          requestedUrl: url,
          finalUrl: normalized,
          retrievedAt,
          contentType: "text/markdown",
          markdown,
          contentHash: sha256Hex(markdown),
          provider: "jina",
          extractorVersion: EXTRACTOR_VERSION,
          outcome,
          warnings: [],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "jina_fetch_failed";
        return {
          requestId,
          requestedUrl: url,
          finalUrl: normalized,
          retrievedAt,
          contentType: "text/markdown",
          markdown: "",
          contentHash: sha256Hex(""),
          provider: "jina",
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
