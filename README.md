# elia-assets

Shared, versioned capabilities for Elia Studio product hosts (Nemrut, Asikz, marketing sites, and future apps).

Former repository name: **elia-site-tools** (guest-agent only). The monorepo now holds multiple **asset verticals** under `packages/`. See [docs/ELIA_ASSETS.md](./docs/ELIA_ASSETS.md) for why this repo exists and how to add new assets.

## Packages

| Package | Role |
|---------|------|
| `@elia/agent-core` | OVH chat, rate limits, Postgres telemetry, weekly reports, Resend mailer |
| `@elia/agent-next` | Chat API handler factory, guest UI, admin report pages |
| `@elia/ermis-data-acquisition` | **EDA**: bounded web search/read, provider adapters (Crawl4AI, Jina legacy) |

Related ADRs (in Nemrut): [0057 EDA](https://github.com/alex-elia/nemrut/blob/develop/docs/adr/0057-ermis-data-acquisition-shared-capability.md), [0056 web research stack](https://github.com/alex-elia/nemrut/blob/develop/docs/adr/0056-reusable-web-research-and-continuous-knowledge-ingestion.md).

## Host wiring (Next.js or Node worker)

1. Copy `templates/next-host/scripts/ensure-elia-assets.mjs` into the host `scripts/` folder.
2. Call it from `preinstall` (alongside other ensure scripts).
3. Depend on packages via `file:` paths under `./elia-assets/` (ensure script still accepts a legacy `elia-site-tools` folder name if present):

```json
{
  "@elia/agent-core": "file:./elia-assets/packages/agent-core",
  "@elia/agent-next": "file:./elia-assets/packages/agent-next",
  "@elia/ermis-data-acquisition": "file:./elia-assets/packages/ermis-data-acquisition"
}
```

4. For **Asikz corpus refresh**, use EDA only for acquire/normalize; chunking, embeddings, and MCP storage stay in the host. See [templates/asikz-host/README.md](./templates/asikz-host/README.md).

### EDA quick start

```ts
import { createEdaClient } from "@elia/ermis-data-acquisition";

const eda = createEdaClient({
  reader: process.env.EDA_READER === "jina" ? "jina" : "crawl4ai",
  crawl4ai: { baseUrl: process.env.CRAWL4AI_BASE_URL! },
  jina: { apiKey: process.env.JINA_API_KEY },
});

const source = await eda.read("https://example.com/docs");
if (source.outcome === "success") {
  // host: compare source.contentHash, chunk, embed, persist corpus
}
```

Env vars (host-owned secrets): `CRAWL4AI_BASE_URL`, optional `CRAWL4AI_API_TOKEN`, `JINA_API_KEY` when using Jina reader.

## Local build

```bash
npm install
npm run build
npm test
```

## Repository name

Local and GitHub repository: **elia-assets** (formerly `elia-site-tools`). Clone URL: `https://github.com/alex-elia/elia-assets.git`. If GitHub still shows the old name, redirects work; override with `ELIA_ASSETS_REPO` in CI when needed.
