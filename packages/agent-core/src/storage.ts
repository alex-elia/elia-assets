import { createHash } from "node:crypto";
import { Pool } from "pg";
import type { AgentEventRecord, WeeklyAgentReport } from "./types.js";

let pool: Pool | null = null;
let schemaReady = false;
let schemaPromise: Promise<void> | null = null;

function getPool(): Pool | null {
  const connectionString = process.env.AGENT_DATABASE_URL?.trim();
  if (!connectionString) return null;
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 5,
      ssl:
        process.env.AGENT_DATABASE_SSL === "disable"
          ? false
          : { rejectUnauthorized: false },
    });
  }
  return pool;
}

export function hashIp(ip: string): string {
  const salt = process.env.AGENT_IP_HASH_SALT?.trim() || "elia-agent";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  if (schemaPromise) return schemaPromise;

  const currentPool = getPool();
  if (!currentPool) return;

  schemaPromise = currentPool
    .query(`
      create table if not exists agent_chat_events (
        id bigserial primary key,
        site_id text not null,
        locale text not null,
        session_id text not null,
        user_prompt text not null,
        assistant_reply text not null default '',
        model text not null default '',
        status text not null,
        latency_ms integer not null default 0,
        hashed_ip text not null default '',
        turn_count integer not null default 0,
        created_at timestamptz not null default now()
      );

      create index if not exists agent_chat_events_site_created_idx
        on agent_chat_events (site_id, created_at desc);

      create index if not exists agent_chat_events_site_session_idx
        on agent_chat_events (site_id, session_id, created_at desc);

      create table if not exists agent_weekly_reports (
        id bigserial primary key,
        site_id text not null,
        week_key text not null,
        report_json jsonb not null,
        markdown text not null,
        generated_at timestamptz not null default now(),
        emailed_at timestamptz,
        unique (site_id, week_key)
      );
    `)
    .then(() => {
      schemaReady = true;
    })
    .finally(() => {
      schemaPromise = null;
    });

  return schemaPromise;
}

export function hasAgentStorage(): boolean {
  return Boolean(process.env.AGENT_DATABASE_URL?.trim());
}

export async function persistChatEvent(event: AgentEventRecord): Promise<void> {
  const currentPool = getPool();
  if (!currentPool) return;
  await ensureSchema();
  await currentPool.query(
    `
      insert into agent_chat_events (
        site_id, locale, session_id, user_prompt, assistant_reply, model,
        status, latency_ms, hashed_ip, turn_count, created_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,coalesce($11::timestamptz, now()))
    `,
    [
      event.siteId,
      event.locale,
      event.sessionId,
      event.userPrompt,
      event.assistantReply,
      event.model,
      event.status,
      event.latencyMs,
      event.hashedIp,
      event.turnCount,
      event.createdAt ?? null,
    ],
  );
}

type RawEvent = {
  locale: string;
  session_id: string;
  user_prompt: string;
  assistant_reply: string;
  status: string;
  created_at: string;
};

export async function loadEventsForWeek(
  siteId: string,
  weekStartIso: string,
  weekEndIso: string,
): Promise<RawEvent[]> {
  const currentPool = getPool();
  if (!currentPool) return [];
  await ensureSchema();
  const result = await currentPool.query<RawEvent>(
    `
      select locale, session_id, user_prompt, assistant_reply, status, created_at
      from agent_chat_events
      where site_id = $1
        and created_at >= $2::timestamptz
        and created_at < $3::timestamptz
      order by created_at desc
    `,
    [siteId, weekStartIso, weekEndIso],
  );
  return result.rows;
}

type StoredReportRow = {
  week_key: string;
  report_json: WeeklyAgentReport;
  markdown: string;
  generated_at: string;
  emailed_at: string | null;
};

export async function upsertWeeklyReport(
  report: WeeklyAgentReport,
): Promise<void> {
  const currentPool = getPool();
  if (!currentPool) return;
  await ensureSchema();
  await currentPool.query(
    `
      insert into agent_weekly_reports (site_id, week_key, report_json, markdown, generated_at)
      values ($1, $2, $3::jsonb, $4, now())
      on conflict (site_id, week_key)
      do update set
        report_json = excluded.report_json,
        markdown = excluded.markdown,
        generated_at = now()
    `,
    [report.siteId, report.weekKey, JSON.stringify(report), report.markdown],
  );
}

export async function markWeeklyReportEmailed(
  siteId: string,
  weekKey: string,
): Promise<void> {
  const currentPool = getPool();
  if (!currentPool) return;
  await ensureSchema();
  await currentPool.query(
    `
      update agent_weekly_reports
      set emailed_at = now()
      where site_id = $1 and week_key = $2
    `,
    [siteId, weekKey],
  );
}

export async function listWeeklyReports(
  siteId: string,
  limit = 12,
): Promise<StoredReportRow[]> {
  const currentPool = getPool();
  if (!currentPool) return [];
  await ensureSchema();
  const result = await currentPool.query<StoredReportRow>(
    `
      select week_key, report_json, markdown, generated_at, emailed_at
      from agent_weekly_reports
      where site_id = $1
      order by week_key desc
      limit $2
    `,
    [siteId, limit],
  );
  return result.rows;
}

export async function getWeeklyReport(
  siteId: string,
  weekKey: string,
): Promise<WeeklyAgentReport | null> {
  const currentPool = getPool();
  if (!currentPool) return null;
  await ensureSchema();
  const result = await currentPool.query<{ report_json: WeeklyAgentReport }>(
    `
      select report_json
      from agent_weekly_reports
      where site_id = $1 and week_key = $2
      limit 1
    `,
    [siteId, weekKey],
  );
  return result.rows[0]?.report_json ?? null;
}
