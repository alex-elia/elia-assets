"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import type { AssistantLabels, LeadCaptureConfig } from "./types.js";

type Message = { role: "user" | "assistant"; content: string };

type Props = {
  locale: string;
  labels: AssistantLabels;
  maxTurns: number;
  leadCapture?: LeadCaptureConfig;
};

function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  const key = "elia-agent-session-id";
  const stored = window.localStorage.getItem(key);
  if (stored) return stored;
  const created = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  window.localStorage.setItem(key, created);
  return created;
}

export function AiChatPanel({ locale, labels, maxTurns, leadCapture }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: labels.greeting },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [leadSending, setLeadSending] = useState(false);
  const [leadSent, setLeadSent] = useState(false);
  const [leadNotice, setLeadNotice] = useState<string | null>(null);

  const userTurns = messages.filter((message) => message.role === "user").length;
  const turnsRemaining = Math.max(0, maxTurns - userTurns);
  const atLimit = userTurns >= maxTurns || blocked;

  async function sendLeadSummary() {
    const turns = messages.filter((message) => message.role === "user").length;
    if (!leadCapture || leadSending || leadSent || turns < leadCapture.minUserTurns) {
      return;
    }
    setLeadSending(true);
    setLeadNotice(null);
    try {
      const res = await fetch(leadCapture.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          sessionId: getSessionId(),
          messages: messages.slice(1),
        }),
      });
      let delivered = false;
      try {
        const data = (await res.json()) as { delivered?: boolean; ok?: boolean };
        delivered = Boolean(data.delivered);
      } catch {
        delivered = false;
      }
      setLeadSent(true);
      const softLead =
        leadCapture.labels.fallback ?? leadCapture.labels.success;
      setLeadNotice(delivered ? leadCapture.labels.success : softLead);
    } catch {
      setLeadSent(true);
      setLeadNotice(leadCapture.labels.fallback ?? leadCapture.labels.success);
    } finally {
      setLeadSending(false);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || loading || atLimit) return;

    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          sessionId: getSessionId(),
          messages: next.slice(1),
        }),
      });
      const data = (await res.json()) as {
        reply?: string;
        error?: string;
        code?: string;
      };

      if (res.status === 503 || data.code === "offline") {
        setOffline(true);
        setMessages((current) => [
          ...current,
          { role: "assistant", content: labels.offline },
        ]);
        return;
      }

      if (res.status === 429) {
        setBlocked(true);
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content:
              data.code === "turn_limit" ? labels.turnLimit : labels.rateLimited,
          },
        ]);
        return;
      }

      if (!res.ok || !data.reply) {
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: labels.fallback ?? labels.offline,
          },
        ]);
        return;
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.reply as string },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: labels.fallback ?? labels.offline },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[min(60vh,22rem)] flex-col">
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        {labels.limitsNotice}
        {!offline && !atLimit ? (
          <span className="mt-1 block text-[11px] text-muted-foreground/80">
            {turnsRemaining} / {maxTurns}
          </span>
        ) : null}
      </p>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1 text-sm">
        {messages.map((message, index) => (
          <div
            key={index}
            className={
              message.role === "user"
                ? "ml-6 rounded-lg bg-primary px-3 py-2 text-primary-foreground"
                : "mr-4 rounded-lg bg-secondary px-3 py-2 text-primary"
            }
          >
            <p className="whitespace-pre-wrap leading-relaxed">
              {message.content}
            </p>
          </div>
        ))}

        {loading ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {labels.thinking}
          </p>
        ) : null}
      </div>

      {leadCapture && userTurns >= leadCapture.minUserTurns ? (
        <div className="mt-2 border-t border-border pt-2">
          {leadSent ? (
            <p className="text-center text-xs leading-snug text-muted-foreground">
              {leadNotice ?? leadCapture.labels.success}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => void sendLeadSummary()}
              disabled={leadSending || loading}
              className="w-full rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-medium text-primary transition hover:bg-accent/20 disabled:opacity-50"
            >
              {leadSending ? leadCapture.labels.sending : leadCapture.labels.button}
            </button>
          )}
        </div>
      ) : null}

      {!offline && !atLimit ? (
        <form
          className="mt-3 flex gap-2 border-t border-border pt-3"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={labels.placeholder}
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-primary outline-none focus:border-primary"
            disabled={loading}
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            aria-label={labels.send}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      ) : null}
    </div>
  );
}
