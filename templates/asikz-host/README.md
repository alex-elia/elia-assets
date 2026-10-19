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

Implement `refreshCorpusUrl(eda, url)` in Asikz with your storage and hash table.

## 5. Next step after this package

Deploy Crawl4AI (and later SearXNG) via **kale-infra** studio-operated manifests, then point `CRAWL4AI_BASE_URL` at the internal service URL.
