import type { ChatMessage, WeeklyAgentReport } from "@elia/agent-core";

export type AssistantLabels = {
  placeholder: string;
  send: string;
  thinking: string;
  error: string;
  /** Soft reply when chat API fails (no technical wording). */
  fallback?: string;
  offline: string;
  greeting: string;
  limitsNotice: string;
  rateLimited: string;
  turnLimit: string;
};

export type LeadCaptureConfig = {
  endpoint: string;
  minUserTurns: number;
  labels: {
    button: string;
    sending: string;
    success: string;
    /** Shown when the server could not email (no red error state). */
    fallback?: string;
  };
};

/** Silent transcript delivery when the visitor closes the panel or leaves the page. */
export type SessionNotifyConfig = {
  endpoint: string;
  minUserTurns: number;
};

export type GuestAssistantProps = {
  locale: string;
  whatsappHref: string;
  bookHref: string;
  phoneDisplay: string;
  hostName: string;
  panelTitle: string;
  panelSubtitle: string;
  whatsappLabel: string;
  bookLabel: string;
  bookHint?: string;
  aiLabel: string;
  backLabel: string;
  closeLabel: string;
  aiLabels: AssistantLabels;
  chatMaxTurns: number;
  bookLinkTarget?: "_self" | "_blank";
  bookIcon?: "mail" | "calendar";
};

export type CreateChatHandlerOptions = {
  siteId: string;
  buildSystemPrompt: (locale: string) => Promise<string>;
  rateLimitedMessage: string;
};

export type AdminOptions = {
  siteId: string;
  subjectPrefix?: string;
};

export type AgentReportListItem = {
  weekKey: string;
  generatedAt: string;
  emailedAt: string | null;
  metrics: WeeklyAgentReport["metrics"];
};

export type AdminPageProps = {
  siteId: string;
  title?: string;
};

export type ChatRequestBody = {
  messages?: ChatMessage[];
  locale?: string;
  sessionId?: string;
};
