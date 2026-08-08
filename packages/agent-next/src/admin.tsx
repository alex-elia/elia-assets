import { cookies } from "next/headers";
import Link from "next/link";
import {
  emailWeeklyAgentReport,
  generateWeeklyAgentReport,
  getOrGenerateWeeklyAgentReport,
  listWeeklyReports,
} from "@elia/agent-core";
import type { WeeklyAgentReport } from "@elia/agent-core";
import type { AdminOptions } from "./types.js";

function getCookieName(siteId: string): string {
  return `elia-agent-admin-${siteId}`;
}

async function isAuthenticated(siteId: string): Promise<boolean> {
  const secret = process.env.AGENT_ADMIN_SECRET?.trim();
  if (!secret) return false;
  const cookieStore = await cookies();
  return cookieStore.get(getCookieName(siteId))?.value === secret;
}

function renderLogin(siteId: string) {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-primary">Agent reports</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the admin secret to view prompt logs and weekly reports.
        </p>
        <form
          action="/api/admin/agent/login"
          method="post"
          className="mt-6 space-y-3"
        >
          <input type="hidden" name="siteId" value={siteId} />
          <input
            type="password"
            name="password"
            placeholder="Admin secret"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Unlock reports
          </button>
        </form>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-primary">{value}</p>
    </div>
  );
}

export async function AgentAdminHomePage({
  siteId,
  title = "Agent reports",
}: {
  siteId: string;
  title?: string;
}) {
  if (!(await isAuthenticated(siteId))) {
    return renderLogin(siteId);
  }

  const reports = await listWeeklyReports(siteId, 12);
  const latest = reports[0]?.report_json ?? null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Detailed weekly prompt and request reports for {siteId}.
          </p>
        </div>
        <div className="flex gap-2">
          <form action="/api/admin/agent/weekly-report" method="post">
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Generate now
            </button>
          </form>
          <form action="/api/admin/agent/logout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-primary"
            >
              Logout
            </button>
          </form>
        </div>
      </div>

      {latest ? (
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <StatCard label="Latest week" value={latest.weekKey} />
          <StatCard label="Sessions" value={latest.metrics.sessions} />
          <StatCard label="Turns" value={latest.metrics.turns} />
          <StatCard
            label="Top locale"
            value={Object.entries(latest.metrics.locales)[0]?.[0] ?? "n/a"}
          />
        </div>
      ) : null}

      <div className="mt-8 rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-primary">Weekly archive</h2>
        </div>
        <div className="divide-y divide-border">
          {reports.length ? (
            reports.map((row) => (
              <Link
                key={row.week_key}
                href={`/admin/agent/${row.week_key}`}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-secondary/40"
              >
                <div>
                  <p className="font-medium text-primary">{row.week_key}</p>
                  <p className="text-sm text-muted-foreground">
                    {row.report_json.metrics.sessions} sessions,{" "}
                    {row.report_json.metrics.turns} turns
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {row.emailed_at ? "emailed" : "not emailed"}
                </p>
              </Link>
            ))
          ) : (
            <p className="px-5 py-8 text-sm text-muted-foreground">
              No reports yet. Generate the first report after traffic starts
              logging.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function renderTranscript(transcript: WeeklyAgentReport["sampleTranscripts"][number]) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-xs text-muted-foreground">
        {transcript.locale} · {transcript.sessionId}
      </p>
      <div className="mt-3 space-y-2 text-sm">
        {transcript.turns.map((turn, index) => (
          <div
            key={`${transcript.sessionId}-${index}`}
            className={
              turn.role === "user"
                ? "rounded-lg bg-primary px-3 py-2 text-primary-foreground"
                : "rounded-lg bg-secondary px-3 py-2 text-primary"
            }
          >
            <p className="mb-1 text-[10px] uppercase tracking-wide opacity-70">
              {turn.role}
            </p>
            <p className="whitespace-pre-wrap">{turn.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export async function AgentAdminWeekPage({
  siteId,
  weekKey,
}: {
  siteId: string;
  weekKey: string;
}) {
  if (!(await isAuthenticated(siteId))) {
    return renderLogin(siteId);
  }

  const report = await getOrGenerateWeeklyAgentReport(siteId, weekKey);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/agent"
            className="text-sm text-accent hover:underline"
          >
            ← Back to reports
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-primary">
            Weekly agent report
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {siteId} · week starting {report.weekKey}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <StatCard label="Sessions" value={report.metrics.sessions} />
        <StatCard label="Turns" value={report.metrics.turns} />
        <StatCard label="Unique days" value={report.metrics.uniqueDays} />
        <StatCard
          label="Locales"
          value={Object.keys(report.metrics.locales).join(", ") || "n/a"}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold text-primary">Top prompts</h2>
          <div className="mt-4 space-y-3">
            {report.topPrompts.map((prompt) => (
              <div key={prompt.normalizedPrompt} className="rounded-xl border border-border p-4">
                <p className="text-sm font-medium text-primary">
                  {prompt.examples[0] ?? prompt.normalizedPrompt}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {prompt.count} occurrences · locales: {prompt.locales.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold text-primary">Gap signals</h2>
          <div className="mt-4 space-y-3">
            {report.gapSignals.length ? (
              report.gapSignals.map((signal) => (
                <div key={signal.type} className="rounded-xl border border-border p-4">
                  <p className="text-sm font-medium text-primary">
                    {signal.type}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {signal.count} events
                  </p>
                  {signal.examples.length ? (
                    <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                      {signal.examples.map((example) => (
                        <li key={example}>{example}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No dominant gap signals for this week.</p>
            )}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold text-primary">Suggested actions</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {report.suggestedActions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold text-primary">Sample transcripts</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {report.sampleTranscripts.length ? (
            report.sampleTranscripts.map((transcript) =>
              renderTranscript(transcript),
            )
          ) : (
            <p className="text-sm text-muted-foreground">
              No transcripts stored for this week.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

export function createAdminLoginHandler() {
  return async function POST(request: Request) {
    const secret = process.env.AGENT_ADMIN_SECRET?.trim();
    if (!secret) {
      return Response.json(
        { error: "AGENT_ADMIN_SECRET is not configured." },
        { status: 500 },
      );
    }

    const form = await request.formData();
    const password = String(form.get("password") ?? "");
    const siteId = String(form.get("siteId") ?? "");
    if (password !== secret || !siteId) {
      return Response.redirect(new URL("/admin/agent", request.url), 302);
    }

    const cookieStore = await cookies();
    cookieStore.set(getCookieName(siteId), secret, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
    return Response.redirect(new URL("/admin/agent", request.url), 302);
  };
}

export function createAdminLogoutHandler(siteId: string) {
  return async function POST(request: Request) {
    const cookieStore = await cookies();
    cookieStore.delete(getCookieName(siteId));
    return Response.redirect(new URL("/admin/agent", request.url), 302);
  };
}

async function ensureAdmin(siteId: string, request?: Request) {
  const cronSecret =
    process.env.AGENT_CRON_SECRET?.trim() || process.env.CRON_SECRET?.trim();
  const headerSecret =
    request?.headers.get("x-agent-cron-secret") ??
    request?.headers.get("x-cron-secret") ??
    request?.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (cronSecret && headerSecret === cronSecret) {
    return null;
  }
  if (!(await isAuthenticated(siteId))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function createWeeklyReportHandler(options: AdminOptions) {
  return async function handler(request: Request) {
    const authError = await ensureAdmin(options.siteId, request);
    if (authError) return authError;

    const report = await generateWeeklyAgentReport(options.siteId);
    await emailWeeklyAgentReport(report, {
      subjectPrefix: options.subjectPrefix ?? options.siteId,
    });

    const accept = request.headers.get("accept") ?? "";
    if (request.method === "POST" && accept.includes("text/html")) {
      return Response.redirect(new URL("/admin/agent", request.url), 302);
    }

    return Response.json({ ok: true, weekKey: report.weekKey });
  };
}

export function createReportListHandler(siteId: string) {
  return async function GET() {
    const authError = await ensureAdmin(siteId);
    if (authError) return authError;
    const rows = await listWeeklyReports(siteId, 12);
    return Response.json({
      reports: rows.map((row) => ({
        weekKey: row.week_key,
        generatedAt: row.generated_at,
        emailedAt: row.emailed_at,
        metrics: row.report_json.metrics,
      })),
    });
  };
}

export function createReportDetailHandler(siteId: string, weekKey: string) {
  return async function GET() {
    const authError = await ensureAdmin(siteId);
    if (authError) return authError;
    const report = await getOrGenerateWeeklyAgentReport(siteId, weekKey);
    return Response.json({ report });
  };
}
