# Asikz host integration (EDA corpus refresh)

Use this checklist when wiring **alex-elia/asikz** to `@elia/ermis-data-acquisition`.

## 1. Depend on elia-assets

- Copy [`../next-host/scripts/ensure-elia-assets.mjs`](../next-host/scripts/ensure-elia-assets.mjs) into `asikz/scripts/`.
- `preinstall`: `node scripts/ensure-elia-assets.mjs`
- `package.json`:

```json
{
  "@elia/ermis-data-acquisition": "file:./elia-assets/packages/ermis-data-acquisition"
}
```

Sibling checkout: place `elia-assets` (or legacy `elia-site-tools`) next to `asikz` and let the ensure script junction/symlink it.

## 2. Environment (server-side only)

| Variable | Required | Purpose |
|----------|----------|---------|
| `CRAWL4AI_BASE_URL` | Yes (recommended reader) | e.g. `http://crawl4ai.studio.svc:11235` after kale-infra deploy |
| `CRAWL4AI_API_TOKEN` | If backend enforces auth | Bearer token for Crawl4AI |
| `EDA_READER` | No | `crawl4ai` (default) or `jina` for migration/smoke |
| `JINA_API_KEY` | If `EDA_READER=jina` | Jina Reader API key |

Until kale-infra backends exist, use `EDA_READER=jina` for local corpus development.

## 3. Corpus refresh flow (host-owned)

```text
Trigger (cron / admin / job)
  -> load canonical URL list for corpus
  -> for each URL (bounded concurrency):
       eda.read(url)
       compare contentHash to stored version
       if changed: chunk -> embed -> upsert MCP/corpus tables + provenance
  -> record failures (outcome !== success) without fabricating content
```

EDA returns `AcquiredSource` with `contentHash`, `retrievedAt`, `extractorVersion`, `finalUrl`, and `outcome`. Do not treat `SearchHit.snippet` as full-page evidence.

## 4. Example acquire helper (sketch)

```ts
import { createEdaClient } from "@elia/ermis-data-acquisition";

export function createAsikzEda() {
  const reader = process.env.EDA_READER === "jina" ? "jina" : "crawl4ai";
  return createEdaClient({
    reader,
    crawl4ai: { baseUrl: process.env.CRAWL4AI_BASE_URL ?? "" },
    jina: { apiKey: process.env.JINA_API_KEY },
  });
}
```

Implemented in asikz: `lib/eda/create-asikz-eda.js`, `lib/kdi/register-acquired.js`, `npm run acquire:to-kdi -- <url>`.

## 5. Komitas Data Indexing (KDI)

```json
"@elia/komitas-data-indexing": "file:./elia-assets/packages/komitas-data-indexing"
```

- Migrations: `supabase/migrations/0009_kdi_dms_schema.sql`, `0010_kdi_search_and_corpus_bridge.sql`
- Edge: `int-kdi-ingest`, `int-kdi-process`, `int-kdi-rag-search`
- Host helpers: `lib/kdi/semantic-search.js`
- See [ADR 0014](https://github.com/alex-elia/asikz/blob/main/docs/adr/0014-komitas-data-indexing.md) on asikz

Flow: EDA `read` → store in `corpus_documents` → `kdi_create_document` → `int-kdi-ingest` with `process_now: true`.

## 6. Next step after EDA package

Deploy Crawl4AI (and later SearXNG) via **kale-infra** studio-operated manifests, then point `CRAWL4AI_BASE_URL` at the internal service URL.
