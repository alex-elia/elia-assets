import { createEdaClient, type EdaClient } from "./client.js";
import { createSearxngSearchProvider } from "./adapters/searxng.js";
import type { EdaClientConfig, ReaderKind } from "./config.js";
import type { EdaHooks } from "./ports.js";

export type EnvSource = Record<string, string | undefined>;

function pickReader(env: EnvSource): ReaderKind {
  const raw = env.EDA_READER?.trim().toLowerCase();
  return raw === "jina" ? "jina" : "crawl4ai";
}

export function edaConfigFromEnv(env: EnvSource = process.env): EdaClientConfig {
  const reader = pickReader(env);
  const hooks: EdaHooks | undefined = undefined;

  const config: EdaClientConfig = {
    reader,
    hooks,
  };

  if (reader === "crawl4ai") {
    config.crawl4ai = {
      baseUrl: env.CRAWL4AI_BASE_URL ?? "",
      apiToken: env.CRAWL4AI_API_TOKEN ?? env.CRAWL4AI_API_KEY,
    };
  } else {
    config.jina = { apiKey: env.JINA_API_KEY };
  }

  const searxBase = env.SEARXNG_BASE_URL?.trim();
  if (searxBase) {
    config.search = createSearxngSearchProvider({
      baseUrl: searxBase,
      language: env.SEARXNG_LANGUAGE,
    });
  } else {
    config.search = null;
  }

  return config;
}

export function createEdaClientFromEnv(env: EnvSource = process.env): EdaClient {
  return createEdaClient(edaConfigFromEnv(env));
}
