import { Resend } from "resend";
import {
  getWeeklyReport,
  listWeeklyReports,
  loadEventsForWeek,
  markWeeklyReportEmailed,
  upsertWeeklyReport,
} from "./storage.js";
import type {
  GapSignal,
  PromptInsight,
  TranscriptSample,
  TranscriptTurn,
  WeeklyAgentReport,
} from "./types.js";

function startOfIsoWeek(date = new Date()): Date {
  const utc = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() - day + 1);
  utc.setUTCHours(0, 0, 0, 0);
  return utc;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toWeekKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizePrompt(prompt: string): string {
  return prompt.toLowerCase().replace(/\s+/g, " ").replace(/[^\p{L}\p{N} ]/gu, "").trim();
}

function groupPrompts(
  rows: { locale: string; user_prompt: string }[],
  limit: number,
): PromptInsight[] {
  const grouped = new Map<
    string,
    { count: number; examples: string[]; locales: Set<string> }
  >();
  for (const row of rows) {
    const normalized = normalizePrompt(row.user_prompt);
    if (!normalized) continue;
    const current =
      grouped.get(normalized) ?? { count: 0, examples: [], locales: new Set() };
    current.count += 1;
    if (!current.examples.includes(row.user_prompt) && current.examples.length < 3) {
      current.examples.push(row.user_prompt);
    }
    current.locales.add(row.locale);
    grouped.set(normalized, current);
  }

  return [...grouped.entries()]
    .map(([normalizedPrompt, value]) => ({
      normalizedPrompt,
      count: value.count,
      examples: value.examples,
      locales: [...value.locales],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function groupThemes(prompts: PromptInsight[]): PromptInsight[] {
  const buckets = new Map<string, PromptInsight>();
  const keywords = [
    { key: "pricing", match: ["price", "cost", "fee", "budget", "tarif"] },
    { key: "availability", match: ["available", "date", "booking", "stay"] },
    { key: "location", match: ["where", "location", "area", "village", "beach"] },
    { key: "services", match: ["service", "package", "process", "advisory"] },
    { key: "investment", match: ["invest", "property", "return", "tax"] },
  ];

  for (const prompt of prompts) {
    const bucket =
      keywords.find((item) =>
        item.match.some((word) => prompt.normalizedPrompt.includes(word)),
      )?.key ?? "other";

    const current = buckets.get(bucket) ?? {
      normalizedPrompt: bucket,
      count: 0,
      examples: [],
      locales: [],
    };
    current.count += prompt.count;
    current.examples.push(...prompt.examples.slice(0, 1));
    current.locales = [...new Set([...current.locales, ...prompt.locales])];
    buckets.set(bucket, current);
  }

  return [...buckets.values()].sort((a, b) => b.count - a.count);
}

function buildGapSignals(
  rows: { status: string; assistant_reply: string; user_prompt: string }[],
): GapSignal[] {
  const signals = new Map<string, GapSignal>();
  for (const row of rows) {
    const text = row.assistant_reply.toLowerCase();
    const bucket =
      row.status === "turn_limit"
        ? "turn_limit"
        : row.status === "rate_limited"
          ? "rate_limited"
          : text.includes("whatsapp")
            ? "redirect_whatsapp"
            : text.includes("not sure") || text.includes("i do not know")
              ? "uncertain_answer"
              : text.includes("schedule")
                ? "redirect_schedule"
                : "";
    if (!bucket) continue;
    const current = signals.get(bucket) ?? {
      type: bucket,
      count: 0,
      examples: [],
    };
    current.count += 1;
    if (current.examples.length < 3) {
      current.examples.push(row.user_prompt);
    }
    signals.set(bucket, current);
  }
  return [...signals.values()].sort((a, b) => b.count - a.count);
}

function buildTranscriptSamples(
  rows: {
    locale: string;
    session_id: string;
    user_prompt: string;
    assistant_reply: string;
    created_at: string;
  }[],
  limit: number,
): TranscriptSample[] {
  const grouped = new Map<
    string,
    { locale: string; turns: TranscriptTurn[]; startedAt: string; lastAt: string }
  >();

  for (const row of [...rows].reverse()) {
    const current = grouped.get(row.session_id) ?? {
      locale: row.locale,
      turns: [],
      startedAt: row.created_at,
      lastAt: row.created_at,
    };
    current.turns.push(
      { role: "user", content: row.user_prompt, createdAt: row.created_at },
      { role: "assistant", content: row.assistant_reply, createdAt: row.created_at },
    );
    current.lastAt = row.created_at;
    grouped.set(row.session_id, current);
  }

  return [...grouped.entries()]
    .map(([sessionId, value]) => ({
      sessionId,
      locale: value.locale,
      turns: value.turns.slice(-8),
      startedAt: value.startedAt,
      lastAt: value.lastAt,
    }))
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
    .slice(0, limit);
}

type ReportInsights = Pick<
  WeeklyAgentReport,
  "metrics" | "topPrompts" | "themeClusters" | "gapSignals" | "sampleTranscripts"
>;

function buildSuggestedActions(report: ReportInsights): string[] {
  const actions: string[] = [];

  const topGap = report.gapSignals[0];
  if (topGap?.type === "redirect_whatsapp") {
    actions.push(
      "Review the most common redirected prompts and convert the top ones into explicit FAQ or service copy.",
    );
  }
  if ((report.metrics.statuses.upstream_error ?? 0) > 0) {
    actions.push("Investigate upstream failures and verify OVH credentials, timeouts, and model availability.");
  }
  if ((report.metrics.statuses.rate_limited ?? 0) > 0) {
    actions.push("Raise or tune chat rate limits if real visitors are hitting the hourly cap.");
  }
  if (report.topPrompts.some((item) => item.normalizedPrompt.includes("price"))) {
    actions.push("Strengthen pricing and process copy because pricing questions are surfacing repeatedly.");
  }
  if (report.topPrompts.some((item) => item.normalizedPrompt.includes("where"))) {
    actions.push("Add more location clarity in the main landing flow and FAQ.");
  }

  if (actions.length === 0) {
    actions.push("No major friction signal dominated this week; review sample transcripts for nuance and add one new FAQ if needed.");
  }
  return actions.slice(0, 5);
}

function renderMarkdown(report: WeeklyAgentReport): string {
  const localeSummary = Object.entries(report.metrics.locales)
    .map(([locale, count]) => `- ${locale}: ${count}`)
    .join("\n");
  const topPrompts = report.topPrompts
    .map((item) => `- ${item.count}x — ${item.examples[0] ?? item.normalizedPrompt}`)
    .join("\n");
  const gaps = report.gapSignals
    .map((item) => `- ${item.type}: ${item.count}`)
    .join("\n");
  const actions = report.suggestedActions.map((item) => `- ${item}`).join("\n");
  const samples = report.sampleTranscripts
    .map(
      (sample) =>
        `### Session ${sample.sessionId}\n` +
        sample.turns
          .map((turn) => `- ${turn.role}: ${turn.content}`)
          .join("\n"),
    )
    .join("\n\n");

  return [
    `# Weekly agent report — ${report.siteId}`,
    "",
    `Week: ${report.weekKey}`,
    `Generated: ${report.generatedAt}`,
    "",
    "## Metrics",
    `- Sessions: ${report.metrics.sessions}`,
    `- Turns: ${report.metrics.turns}`,
    `- Unique days: ${report.metrics.uniqueDays}`,
    "",
    "## Locales",
    localeSummary || "- none",
    "",
    "## Top prompts",
    topPrompts || "- none",
    "",
    "## Gap signals",
    gaps || "- none",
    "",
    "## Suggested actions",
    actions,
    "",
    "## Sample transcripts",
    samples || "- none",
  ].join("\n");
}

export function getDefaultReportWindow(now = new Date()): {
  weekStart: Date;
  weekEnd: Date;
  weekKey: string;
} {
  const currentWeekStart = startOfIsoWeek(now);
  const previousWeekStart = addDays(currentWeekStart, -7);
  return {
    weekStart: previousWeekStart,
    weekEnd: currentWeekStart,
    weekKey: toWeekKey(previousWeekStart),
  };
}

export async function generateWeeklyAgentReport(
  siteId: string,
  weekKey?: string,
): Promise<WeeklyAgentReport> {
  const { weekStart, weekEnd, weekKey: defaultWeekKey } = getDefaultReportWindow();
  const selectedWeekStart = weekKey ? new Date(`${weekKey}T00:00:00.000Z`) : weekStart;
  const selectedWeekEnd = addDays(selectedWeekStart, 7);
  const selectedWeekKey = weekKey ?? defaultWeekKey;

  const rows = await loadEventsForWeek(
    siteId,
    selectedWeekStart.toISOString(),
    selectedWeekEnd.toISOString(),
  );

  const locales = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.locale] = (acc[row.locale] ?? 0) + 1;
    return acc;
  }, {});
  const statuses = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});
  const uniqueDays = new Set(rows.map((row) => row.created_at.slice(0, 10))).size;
  const sessions = new Set(rows.map((row) => row.session_id)).size;
  const topPrompts = groupPrompts(rows, 10);
  const themeClusters = groupThemes(topPrompts).slice(0, 6);
  const gapSignals = buildGapSignals(rows);
  const sampleTranscripts = buildTranscriptSamples(rows, 5);

  const partial = {
    metrics: {
      sessions,
      turns: rows.length,
      uniqueDays,
      locales,
      statuses,
    },
    topPrompts,
    themeClusters,
    gapSignals,
    sampleTranscripts,
  };
  const suggestedActions = buildSuggestedActions(partial);

  const report: WeeklyAgentReport = {
    siteId,
    weekKey: selectedWeekKey,
    generatedAt: new Date().toISOString(),
    ...partial,
    suggestedActions,
    markdown: "",
  };
  report.markdown = renderMarkdown(report);
  await upsertWeeklyReport(report);
  return report;
}

export async function emailWeeklyAgentReport(
  report: WeeklyAgentReport,
  opts?: { to?: string | string[]; from?: string; subjectPrefix?: string },
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = opts?.from ?? process.env.RESEND_FROM?.trim();
  const to = opts?.to ?? process.env.AGENT_REPORT_TO?.trim();
  if (!apiKey || !from || !to) return;

  const resend = new Resend(apiKey);
  const subjectPrefix = opts?.subjectPrefix ?? report.siteId;
  await resend.emails.send({
    from,
    to,
    subject: `[${subjectPrefix}] Weekly agent report ${report.weekKey}`,
    text: report.markdown,
    html: `<pre style="font-family:ui-monospace, SFMono-Regular, Menlo, monospace; white-space:pre-wrap;">${report.markdown.replace(/[<>&]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[char]!)}</pre>`,
  });
  await markWeeklyReportEmailed(report.siteId, report.weekKey);
}

export async function getOrGenerateWeeklyAgentReport(
  siteId: string,
  weekKey?: string,
): Promise<WeeklyAgentReport> {
  if (weekKey) {
    const existing = await getWeeklyReport(siteId, weekKey);
    if (existing) return existing;
  }
  return generateWeeklyAgentReport(siteId, weekKey);
}

export { getWeeklyReport, listWeeklyReports };
