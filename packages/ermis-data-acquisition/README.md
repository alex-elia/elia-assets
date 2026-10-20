# @elia/ermis-data-acquisition

Ermis Data Acquisition (EDA): server-side web read and (optional) search adapters for Elia hosts.

## Usage

```ts
import { createEdaClient } from "@elia/ermis-data-acquisition";

const eda = createEdaClient({
  reader: "crawl4ai",
  crawl4ai: { baseUrl: process.env.CRAWL4AI_BASE_URL! },
});

const source = await eda.read("https://example.com");
```

## Outcomes

`AcquiredSource.outcome` is one of `success`, `partial`, `blocked`, `unavailable`, `unsupported`. Empty markdown with HTTP errors is **not** reported as success.

## Adapters

| Reader | Config |
|--------|--------|
| `crawl4ai` | `crawl4ai.baseUrl`, optional `apiToken` |
| `jina` | optional `jina.apiKey` (legacy / smoke) |

Search: set `SEARXNG_BASE_URL` and use `createEdaClientFromEnv()` or pass `createSearxngSearchProvider` on config.

Local backends: `kale-infra/Local_Infra_Tools/eda-local` (data on D: via `EDA_DATA_ROOT`). Smoke: `npm run eda:smoke` from elia-assets root.

## Boundaries

No LLM calls, no database writes, no host domain imports. See Nemrut ADR-0057.
