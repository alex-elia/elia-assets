# elia-site-tools

Shared guest-agent stack for Elia Next.js sites (Konaki, Onira, and future hosts).

## Packages

- `@elia/agent-core` — OVH chat client, rate limits, Postgres telemetry, weekly report generation, Resend mailer
- `@elia/agent-next` — chat API handler factory, floating guest UI, secret-gated admin report pages/APIs

## Host wiring

1. Add `scripts/ensure-elia-tools.mjs` (see `templates/next-host/scripts/`).
2. Call it from host `preinstall` (alongside Matia if present).
3. Depend on:

```json
{
  "@elia/agent-core": "file:./elia-site-tools/packages/agent-core",
  "@elia/agent-next": "file:./elia-site-tools/packages/agent-next"
}
```

4. Keep site-specific `ai-context.ts` in the host.
5. Use thin wrappers:

```ts
export const POST = createChatHandler({
  siteId: "my-site",
  buildSystemPrompt: buildAssistantSystemPrompt,
  rateLimitedMessage: "Too many requests.",
});
```

## Required env

- `OVH_AI_ENDPOINTS_ACCESS_TOKEN`
- `AGENT_DATABASE_URL` — shared Postgres for prompt logs + weekly reports
- `AGENT_ADMIN_SECRET` — unlock `/admin/agent`
- `AGENT_REPORT_TO` + existing Resend vars for weekly email
- optional `AGENT_CRON_SECRET` for cron-protected report generation

## Local build

```bash
npm install
npm run build
```
