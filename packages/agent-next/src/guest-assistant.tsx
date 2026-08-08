"use client";

import { useState } from "react";
import { Calendar, Mail, MessageCircle, X } from "lucide-react";
import { AiChatPanel } from "./ai-chat-panel.js";
import type { GuestAssistantProps } from "./types.js";

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

type View = "menu" | "ai";

export function GuestAssistant(props: GuestAssistantProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");

  const BookIcon = props.bookIcon === "mail" ? Mail : Calendar;

  function close() {
    setOpen(false);
    setView("menu");
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open ? (
        <div
          className={cn(
            "rounded-2xl border border-border bg-card p-4 shadow-lg",
            view === "ai"
              ? "w-[min(100vw-2.5rem,22rem)]"
              : "w-[min(100vw-2.5rem,20rem)]",
          )}
          role="dialog"
          aria-label={props.panelTitle}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              {view === "ai" ? (
                <button
                  type="button"
                  onClick={() => setView("menu")}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  ← {props.backLabel}
                </button>
              ) : null}
              <p className="font-heading text-sm font-semibold text-primary">
                {view === "ai" ? props.aiLabel : props.panelTitle}
              </p>
              {view === "menu" ? (
                <>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {props.panelSubtitle}
                  </p>
                  <p className="mt-2 text-xs font-medium text-primary">
                    {props.hostName}
                  </p>
                </>
              ) : null}
            </div>
            <button
              type="button"
              onClick={close}
              className="rounded-lg p-1 text-muted-foreground transition hover:bg-secondary hover:text-primary"
              aria-label={props.closeLabel}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {view === "menu" ? (
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setView("ai")}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                <MessageCircle className="h-4 w-4" />
                {props.aiLabel}
              </button>
              <a
                href={props.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#1fb855]"
              >
                <MessageCircle className="h-4 w-4" />
                {props.whatsappLabel}
              </a>
              <a
                href={props.bookHref}
                target={props.bookLinkTarget ?? "_self"}
                rel={
                  props.bookLinkTarget === "_blank"
                    ? "noopener noreferrer"
                    : undefined
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-primary transition hover:bg-secondary"
              >
                <BookIcon className="h-4 w-4" />
                {props.bookLabel}
              </a>
              {props.bookHint ? (
                <p className="text-center text-[11px] leading-snug text-muted-foreground">
                  {props.bookHint}
                </p>
              ) : null}
              <p className="text-center text-xs text-muted-foreground">
                {props.phoneDisplay}
              </p>
            </div>
          ) : (
            <div className="mt-3">
              <AiChatPanel
                locale={props.locale}
                labels={props.aiLabels}
                maxTurns={props.chatMaxTurns}
              />
            </div>
          )}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:bg-primary/90 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          open && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background",
        )}
        aria-expanded={open}
        aria-label={props.panelTitle}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
