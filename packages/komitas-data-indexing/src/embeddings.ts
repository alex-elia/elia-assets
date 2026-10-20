import {
  resolveEmbeddingModelForProvider,
  type EmbeddingProvider,
} from "./embedding-model.js";

export type { EmbeddingProvider };
export { resolveEmbeddingModelForProvider };

export interface EmbeddingEnv {
  get(name: string): string | undefined;
}

export interface EmbeddingResult {
  embedding: number[];
  totalTokens?: number;
  promptTokens?: number;
  model: string;
  provider: EmbeddingProvider;
}

const OPENAI_DEFAULT_EMBEDDING = "text-embedding-3-small";

export function getDefaultEmbeddingModel(env: EmbeddingEnv): string {
  return (
    env.get("OVH_AI_EMBEDDING_MODEL")
    ?? env.get("OPENAI_EMBEDDING_MODEL")
    ?? env.get("SUPABASE_EMBEDDING_MODEL")
    ?? OPENAI_DEFAULT_EMBEDDING
  );
}

export function detectEmbeddingProvider(env: EmbeddingEnv): EmbeddingProvider | null {
  if (
    env.get("OVH_AI_EMBEDDING_URL")
    || env.get("OVH_AI_UNIFIED_MODEL_URL")
    || env.get("OVH_AI_ENDPOINTS_MODEL_URL")
  ) {
    return "ovh";
  }
  if (env.get("OPENAI_API_KEY")) {
    return "openai";
  }
  return null;
}

export async function generateEmbedding(
  text: string,
  env: EmbeddingEnv,
  model?: string,
  provider?: EmbeddingProvider | null,
): Promise<EmbeddingResult> {
  const resolvedProvider = provider ?? detectEmbeddingProvider(env);
  if (!resolvedProvider) {
    throw new Error("embedding provider is not configured");
  }
  const resolvedModel = model ?? getDefaultEmbeddingModel(env);
  if (resolvedProvider === "ovh") {
    return generateOvhEmbedding(
      text,
      env,
      resolveEmbeddingModelForProvider(resolvedModel, "ovh"),
    );
  }
  return generateOpenAIEmbedding(text, env, resolvedModel);
}

export async function generateEmbeddings(
  texts: string[],
  env: EmbeddingEnv,
  model?: string,
  provider?: EmbeddingProvider | null,
): Promise<EmbeddingResult[]> {
  const resolvedProvider = provider ?? detectEmbeddingProvider(env);
  const resolvedModel = model ?? getDefaultEmbeddingModel(env);
  if (!resolvedProvider) {
    throw new Error("embedding provider is not configured");
  }
  if (resolvedProvider === "ovh") {
    const results: EmbeddingResult[] = [];
    for (const text of texts) {
      results.push(
        await generateOvhEmbedding(
          text,
          env,
          resolveEmbeddingModelForProvider(resolvedModel, "ovh"),
        ),
      );
    }
    return results;
  }
  return generateOpenAIEmbeddings(texts, env, resolvedModel);
}

function resolveOvhEmbeddingUrl(env: EmbeddingEnv, model: string): string {
  const embeddingUrl = env.get("OVH_AI_EMBEDDING_URL");
  const unifiedModelUrl = env.get("OVH_AI_UNIFIED_MODEL_URL");
  const legacyModelUrl = env.get("OVH_AI_ENDPOINTS_MODEL_URL");
  const modelUrl = unifiedModelUrl || legacyModelUrl;

  if (embeddingUrl) {
    return embeddingUrl.endsWith("/embeddings")
      ? embeddingUrl
      : `${embeddingUrl}/embeddings`;
  }
  if (modelUrl) {
    const envModelUrlRaw = modelUrl.replace(/\/$/, "");
    const envLooksLikeChatEndpoint =
      /openai_compat\/.+\/chat\/completions|\/v1\/chat\/completions$/i.test(
        envModelUrlRaw,
      );
    if (envLooksLikeChatEndpoint) {
      return envModelUrlRaw.replace(/\/chat\/completions$/i, "/embeddings");
    }
    const apiBase =
      envModelUrlRaw && !/openai_compat|\/api\//i.test(envModelUrlRaw)
        ? envModelUrlRaw.endsWith("/v1")
          ? envModelUrlRaw
          : `${envModelUrlRaw}/v1`
        : "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1";
    return `${apiBase}/embeddings`;
  }
  return "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/embeddings";
}

function normalizeOvhModel(model: string): string {
  const lower = model.toLowerCase();
  if (lower === "baai/bge-m3" || lower === "bge-m3") {
    return "BGE-M3";
  }
  return model.toUpperCase();
}

async function generateOvhEmbedding(
  text: string,
  env: EmbeddingEnv,
  model: string,
): Promise<EmbeddingResult> {
  const token = env.get("OVH_AI_ENDPOINTS_ACCESS_TOKEN");
  if (!token) {
    throw new Error("ovh embedding access token is not configured");
  }
  const modelVariant = normalizeOvhModel(model);
  const url = resolveOvhEmbeddingUrl(env, modelVariant);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: modelVariant, input: text }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `ovh embedding request failed: ${response.status} - ${url} - ${errorText}`,
    );
  }

  const payload = (await response.json()) as {
    data?: Array<{ embedding?: number[]; model?: string }>;
    usage?: { total_tokens?: number; prompt_tokens?: number };
  };
  const vector = payload?.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error("ovh embedding response did not include embedding vector");
  }

  const totalTokens =
    payload?.usage?.total_tokens ?? payload?.usage?.prompt_tokens ?? 0;

  return {
    embedding: vector,
    totalTokens,
    promptTokens: payload?.usage?.prompt_tokens ?? totalTokens,
    model: payload?.data?.[0]?.model ?? modelVariant,
    provider: "ovh",
  };
}

async function generateOpenAIEmbedding(
  text: string,
  env: EmbeddingEnv,
  model: string,
): Promise<EmbeddingResult> {
  const apiKey = env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("openai api key not configured");
  }
  const baseUrl = env.get("OPENAI_BASE_URL") || "https://api.openai.com/v1";

  const response = await fetch(`${baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: text }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `openai embedding request failed: ${response.status} ${errorText}`,
    );
  }

  const payload = (await response.json()) as {
    data?: Array<{ embedding?: number[]; model?: string }>;
    usage?: { total_tokens?: number; prompt_tokens?: number };
  };
  const vector = payload?.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error("openai embedding response did not include embedding vector");
  }

  return {
    embedding: vector,
    totalTokens: payload?.usage?.total_tokens ?? payload?.usage?.prompt_tokens,
    promptTokens: payload?.usage?.prompt_tokens,
    model: payload?.data?.[0]?.model ?? model,
    provider: "openai",
  };
}

async function generateOpenAIEmbeddings(
  texts: string[],
  env: EmbeddingEnv,
  model: string,
): Promise<EmbeddingResult[]> {
  const apiKey = env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("openai api key not configured");
  }
  const baseUrl = env.get("OPENAI_BASE_URL") || "https://api.openai.com/v1";

  const response = await fetch(`${baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: texts }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `openai embedding request failed: ${response.status} ${errorText}`,
    );
  }

  const payload = (await response.json()) as {
    data?: Array<{ embedding?: number[]; model?: string; index?: number }>;
    usage?: { total_tokens?: number; prompt_tokens?: number };
  };
  if (!payload?.data || !Array.isArray(payload.data)) {
    throw new Error("openai embedding batch response invalid");
  }

  const sorted = [...payload.data].sort(
    (a, b) => (a.index ?? 0) - (b.index ?? 0),
  );

  return sorted.map((item) => {
    const vector = item.embedding;
    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error("openai embedding item missing vector");
    }
    return {
      embedding: vector,
      totalTokens: payload.usage?.total_tokens,
      promptTokens: payload.usage?.prompt_tokens,
      model: item.model ?? model,
      provider: "openai" as const,
    };
  });
}

/** Node / Deno: pass `process.env` or a custom map. */
export function createNodeEmbeddingEnv(
  source: Record<string, string | undefined> = process.env,
): EmbeddingEnv {
  return {
    get(name: string) {
      return source[name];
    },
  };
}
