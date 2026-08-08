-- Shared agent telemetry schema (auto-created by @elia/agent-core at runtime)

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
