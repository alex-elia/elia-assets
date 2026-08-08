import {
  CHAT_MAX_HISTORY,
  CHAT_MAX_MESSAGE_CHARS,
  CHAT_MAX_USER_TURNS,
  checkHourlyIpLimit,
  countUserTurns,
  getClientIp,
  hasAgentStorage,
  hasOvhChatConfig,
  hashIp,
  persistChatEvent,
  resolveChatModel,
  callOvhChat,
  isSameSiteRequest,
} from "@elia/agent-core";
import type { ChatMessage } from "@elia/agent-core";
import type { ChatRequestBody, CreateChatHandlerOptions } from "./types.js";

function trimText(value: string, max = 8000): string {
  return value.trim().slice(0, max);
}

async function persistAttempt(params: {
  siteId: string;
  locale: string;
  sessionId: string;
  userPrompt: string;
  assistantReply: string;
  status:
    | "ok"
    | "offline"
    | "forbidden"
    | "rate_limited"
    | "turn_limit"
    | "bad_request"
    | "upstream_error";
  latencyMs: number;
  ip: string;
  turnCount: number;
}) {
  if (!hasAgentStorage()) return;
  try {
    await persistChatEvent({
      siteId: params.siteId,
      locale: params.locale,
      sessionId: params.sessionId,
      userPrompt: trimText(params.userPrompt, 4000),
      assistantReply: trimText(params.assistantReply, 8000),
      model: resolveChatModel(),
      status: params.status,
      latencyMs: params.latencyMs,
      hashedIp: hashIp(params.ip),
      turnCount: params.turnCount,
    });
  } catch (error) {
    console.error("[agent-chat:persist]", error);
  }
}

export function createChatHandler(options: CreateChatHandlerOptions) {
  return async function POST(request: Request) {
    const startedAt = Date.now();
    const ip = getClientIp(request);

    if (!hasOvhChatConfig()) {
      return Response.json(
        { error: "AI assistant is not configured yet.", code: "offline" },
        { status: 503 },
      );
    }

    if (!isSameSiteRequest(request)) {
      return Response.json(
        { error: "Forbidden.", code: "forbidden" },
        { status: 403 },
      );
    }

    if (!checkHourlyIpLimit(ip)) {
      return Response.json(
        { error: options.rateLimitedMessage, code: "rate_limited" },
        { status: 429 },
      );
    }

    let body: ChatRequestBody;
    try {
      body = (await request.json()) as ChatRequestBody;
    } catch {
      return Response.json(
        { error: "Invalid request.", code: "bad_request" },
        { status: 400 },
      );
    }

    const messages = body.messages?.slice(-CHAT_MAX_HISTORY) ?? [];
    const locale = body.locale ?? "en";
    const sessionId = body.sessionId?.trim() || "anonymous";

    if (messages.length === 0 || messages.at(-1)?.role !== "user") {
      return Response.json(
        { error: "No user message.", code: "bad_request" },
        { status: 400 },
      );
    }

    const userTurns = countUserTurns(messages);
    const last = messages.at(-1)!.content.trim();

    if (userTurns > CHAT_MAX_USER_TURNS) {
      await persistAttempt({
        siteId: options.siteId,
        locale,
        sessionId,
        userPrompt: last,
        assistantReply: "",
        status: "turn_limit",
        latencyMs: Date.now() - startedAt,
        ip,
        turnCount: userTurns,
      });
      return Response.json(
        {
          error: "Message limit reached for this visit.",
          code: "turn_limit",
          maxTurns: CHAT_MAX_USER_TURNS,
        },
        { status: 429 },
      );
    }

    if (last.length > CHAT_MAX_MESSAGE_CHARS) {
      await persistAttempt({
        siteId: options.siteId,
        locale,
        sessionId,
        userPrompt: last,
        assistantReply: "",
        status: "bad_request",
        latencyMs: Date.now() - startedAt,
        ip,
        turnCount: userTurns,
      });
      return Response.json(
        { error: "Message too long.", code: "bad_request" },
        { status: 400 },
      );
    }

    const system = await options.buildSystemPrompt(locale);
    try {
      const reply = await callOvhChat(
        [
          { role: "system", content: system },
          ...messages.map((message) => ({
            role: message.role as "user" | "assistant",
            content: message.content,
          })),
        ],
        { temperature: 0.4, max_tokens: 600 },
      );

      await persistAttempt({
        siteId: options.siteId,
        locale,
        sessionId,
        userPrompt: last,
        assistantReply: reply,
        status: "ok",
        latencyMs: Date.now() - startedAt,
        ip,
        turnCount: userTurns,
      });

      return Response.json({
        reply,
        limits: {
          maxTurns: CHAT_MAX_USER_TURNS,
          turnsUsed: userTurns,
          turnsRemaining: Math.max(0, CHAT_MAX_USER_TURNS - userTurns),
        },
      });
    } catch (error) {
      console.error("[chat]", error);
      await persistAttempt({
        siteId: options.siteId,
        locale,
        sessionId,
        userPrompt: last,
        assistantReply: "",
        status: "upstream_error",
        latencyMs: Date.now() - startedAt,
        ip,
        turnCount: userTurns,
      });
      return Response.json(
        { error: "Assistant unavailable.", code: "upstream_error" },
        { status: 502 },
      );
    }
  };
}

export type { ChatMessage };
