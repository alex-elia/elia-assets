export type EmbeddingProvider = "ovh" | "openai" | "supabase";

/** Resolve model name for the active provider (OVH does not serve OpenAI embedding model ids). */
export function resolveEmbeddingModelForProvider(
  model: string,
  provider: EmbeddingProvider,
): string {
  if (provider !== "ovh") return model;
  const lower = model.trim().toLowerCase();
  if (
    lower === "text-embedding-3-small"
    || lower === "text-embedding-3-large"
    || lower === "text-embedding-ada-002"
  ) {
    return "BGE-M3";
  }
  return model;
}
