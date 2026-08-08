export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type PersistedChatStatus =
  | "ok"
  | "offline"
  | "forbidden"
  | "rate_limited"
  | "turn_limit"
  | "bad_request"
  | "upstream_error";

export type AgentEventRecord = {
  siteId: string;
  locale: string;
  sessionId: string;
  userPrompt: string;
  assistantReply: string;
  model: string;
  status: PersistedChatStatus;
  latencyMs: number;
  hashedIp: string;
  turnCount: number;
  createdAt?: string;
};

export type TranscriptTurn = {
  role: ChatRole;
  content: string;
  createdAt?: string;
};

export type TranscriptSample = {
  sessionId: string;
  locale: string;
  turns: TranscriptTurn[];
  startedAt: string;
  lastAt: string;
};

export type PromptInsight = {
  normalizedPrompt: string;
  count: number;
  examples: string[];
  locales: string[];
};

export type GapSignal = {
  type: string;
  count: number;
  examples: string[];
};

export type WeeklyAgentReport = {
  siteId: string;
  weekKey: string;
  generatedAt: string;
  metrics: {
    sessions: number;
    turns: number;
    uniqueDays: number;
    locales: Record<string, number>;
    statuses: Record<string, number>;
  };
  topPrompts: PromptInsight[];
  themeClusters: PromptInsight[];
  gapSignals: GapSignal[];
  sampleTranscripts: TranscriptSample[];
  suggestedActions: string[];
  markdown: string;
};
