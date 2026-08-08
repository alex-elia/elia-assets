const DEFAULT_BASE_URL = "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1";
export const DEFAULT_CHAT_MODEL = "gpt-oss-20b";

export type OvhChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OvhChatOptions = {
  model?: string;
  temperature?: number;
  max_tokens?: number;
};

function resolveChatCompletionsUrl(): string {
  const chatUrl = process.env.OVH_AI_CHAT_URL?.trim();
  if (chatUrl) {
    return chatUrl.endsWith("/chat/completions")
      ? chatUrl
      : `${chatUrl.replace(/\/$/, "")}/chat/completions`;
  }

  const modelUrl =
    process.env.OVH_AI_UNIFIED_MODEL_URL?.trim() ||
    process.env.OVH_AI_ENDPOINTS_MODEL_URL?.trim();
  if (modelUrl) {
    const raw = modelUrl.replace(/\/$/, "");
    if (/openai_compat\/.+\/chat\/completions|\/v1\/chat\/completions$/i.test(raw)) {
      return raw;
    }
    const apiBase =
      raw && !/openai_compat|\/api\//i.test(raw)
        ? raw.endsWith("/v1")
          ? raw
          : `${raw}/v1`
        : DEFAULT_BASE_URL;
    return `${apiBase}/chat/completions`;
  }

  return `${DEFAULT_BASE_URL}/chat/completions`;
}

function extractMessageContent(message: Record<string, unknown>): string {
  let content: unknown = message.content ?? "";
  if (Array.isArray(content)) {
    content = content
      .map((part) =>
        typeof part === "string"
          ? part
          : part && typeof part === "object" && "text" in part
            ? String((part as { text?: string }).text ?? "")
            : "",
      )
      .join("");
  } else if (typeof content !== "string") {
    content = String(content ?? "");
  }

  if (!content && (message.reasoning != null || message.reasoning_content != null)) {
    const reasoning = message.reasoning ?? message.reasoning_content;
    content = typeof reasoning === "string" ? reasoning : String(reasoning ?? "");
  }

  return typeof content === "string" ? content : String(content ?? "");
}

export function hasOvhChatConfig(): boolean {
  return Boolean(process.env.OVH_AI_ENDPOINTS_ACCESS_TOKEN?.trim());
}

export function resolveChatModel(): string {
  return (
    process.env.OVH_AI_CHAT_MODEL?.trim() ||
    process.env.OVH_AI_ORCHESTRATOR_MODEL?.trim() ||
    DEFAULT_CHAT_MODEL
  );
}

export async function callOvhChat(
  messages: OvhChatMessage[],
  options: OvhChatOptions = {},
): Promise<string> {
  const token = process.env.OVH_AI_ENDPOINTS_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error("OVH_AI_ENDPOINTS_ACCESS_TOKEN is not configured");
  }

  const url = resolveChatCompletionsUrl();
  const model = options.model ?? resolveChatModel();
  const timeoutMs = 90_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.4,
        max_tokens: options.max_tokens ?? 600,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`OVH chat ${res.status}: ${errText.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: Record<string, unknown> }[];
      error?: { message?: string };
    };

    if (data.error?.message) {
      throw new Error(data.error.message);
    }

    const message = data.choices?.[0]?.message;
    if (!message) {
      throw new Error("OVH chat returned an empty response");
    }

    const content = extractMessageContent(message).trim();
    if (!content) {
      throw new Error("OVH chat returned an empty response");
    }

    return content;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("OVH chat timed out");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
