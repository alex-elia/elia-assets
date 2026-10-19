import { createCrawl4AiPageReader } from "./adapters/crawl4ai.js";
import { createJinaPageReader } from "./adapters/jina.js";
import type { EdaHooks, PageReader, SearchProvider } from "./ports.js";

export type ReaderKind = "crawl4ai" | "jina";

export type EdaClientConfig = {
  reader: ReaderKind;
  crawl4ai?: {
    baseUrl: string;
    apiToken?: string;
  };
  jina?: {
    apiKey?: string;
  };
  search?: SearchProvider | null;
  hooks?: EdaHooks;
  fetchFn?: typeof fetch;
};

export function resolvePageReader(config: EdaClientConfig): PageReader {
  const fetchFn = config.fetchFn;
  if (config.reader === "crawl4ai") {
    const baseUrl = config.crawl4ai?.baseUrl?.trim();
    if (!baseUrl) {
      throw new Error("EDA reader crawl4ai requires crawl4ai.baseUrl");
    }
    return createCrawl4AiPageReader({
      baseUrl,
      apiToken: config.crawl4ai?.apiToken,
      fetchFn,
    });
  }
  return createJinaPageReader({
    apiKey: config.jina?.apiKey,
    fetchFn,
  });
}
