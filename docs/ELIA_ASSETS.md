# Elia assets monorepo (`elia-assets`)

**Status:** Adopted 2026-10-19  
**Decision owners:** Elia Studio  
**Supersedes:** "elia-site-tools = marketing site helpers only"

## Context

Elia Studio ships several products (Nemrut, Asikz, client sites) that need the same technical building blocks without copying code into each repository. Early work lived in **elia-site-tools** as `@elia/agent-*` for Konaki/Onira guest chat. New decisions ([Nemrut ADR-0057](https://github.com/alex-elia/nemrut/blob/develop/docs/adr/0057-ermis-data-acquisition-shared-capability.md)) require a **canonical shared-capabilities repository** for **Ermis Data Acquisition (EDA)** and future reuse across Nemrut and Asikz.

Creating a new repo per capability would multiply release plumbing and clone scripts. The site-tools monorepo already solved host wiring (`ensure-*` preinstall, `file:` workspace packages, `@elia` scope).

## Decision

**Evolve `elia-site-tools` into `elia-assets`**: one private monorepo for Studio-owned reusable packages, each in `packages/<name>` with its own semver and build.

| Principle | Implication |
|-----------|-------------|
| One repo, many verticals | Guest agent, EDA, and future assets coexist; they do not share runtime code unless explicitly designed |
| Host workflows stay local | Packages return evidence or UI primitives; business writes, LLM extraction, and scheduling stay in Nemrut/Asikz |
| Fixes go upstream | Do not fork or patch package source inside consumer repos ([ADR-0057](https://github.com/alex-elia/nemrut/blob/develop/docs/adr/0057-ermis-data-acquisition-shared-capability.md)) |
| Node 20+ server-side | EDA targets trusted Node runtimes; Deno edge functions call an internal API or worker that uses the package |
| Publish per package | Each `@elia/*` ships on GitHub Packages (`npm.pkg.github.com`) with its own semver tag (e.g. `aqms-core-v0.1.0`). Do not grant clients the monorepo; grant **read:packages** on named packages only |

## Package map (initial)

```text
elia-assets/
  packages/agent-core/          @elia/agent-core
  packages/agent-next/          @elia/agent-next
  packages/ermis-data-acquisition/   @elia/ermis-data-acquisition (EDA)
  packages/komitas-data-indexing/    @elia/komitas-data-indexing (KDI)
  packages/amira-retrieval/          @elia/amira-retrieval (ARO: hybrid retrieval orchestration)
  packages/sinan-ingestion-quality/  @elia/sinan-ingestion-quality (Sinan: ingestion assess, redressement, publish score)
  packages/aqms-core/                @elia/aqms-core (AQMS technical kernel: checks, export gate, calibration)
  packages/janissary-auth/           @elia/janissary-auth (Janissary: Next.js identity facade, Supabase adapter v1)
  templates/next-host/          Konaki, Onira, generic Next hosts
  templates/asikz-host/       Asikz corpus / MCP integration notes
```

## What belongs here vs in product repos

| Belongs in **elia-assets** | Belongs in **Nemrut / Asikz** |
|----------------------------|-------------------------------|
| Provider adapters (Crawl4AI, Jina, later SearXNG/Tavily) | Corpus schemas, MCP tools, CRM tables |
| KDI: chunking, embedding clients, `VectorIndex` pgvector adapter | DMS SQL migrations, Edge deployables, scope/RPC policy |
| Technical normalization types (`AcquiredSource`, `SearchHit`) | Poem segmentation, corpus promotion, availability filters |
| URL policy, timeouts, honest failure outcomes | pg-boss jobs, LangGraph research graphs |
| Contract tests for adapters | FinOps, tenant authorization |
| AQMS kernel: `QualityCheckResult`, `finalizeCheckResult`, export gate, calibration math, host rubric YAML parse | AQMS adapters, Supabase `ai_*` tables, judge Edge calls, admin dashboard, module-specific checks |

## Infrastructure boundary

EDA **calls** studio-operated HTTP services (Crawl4AI, SearXNG). Those deployments live in **kale-infra** (or customer-managed endpoints), not inside this npm package. Package version and backend image version are tracked separately (compatibility matrix in infra docs when backends land).

## Adding a new asset

1. Add `packages/<kebab-name>/` with `package.json` name `@elia/<kebab-name>`.
2. Add `publishConfig.registry` and a `publish-<name>.yml` workflow (tag pattern `<package>-v*`, e.g. `aqms-core-v0.1.0`).
3. Consumers depend on semver from GitHub Packages (`@elia:registry` in `.npmrc`), not a clone of this repo.
4. Site hosts may keep `ensure-elia-assets.mjs` for **local** monorepo dev; product CI (Nemrut, Atlas) uses published packages only.
5. Document env vars and host responsibilities in package README.
6. Link the Nemrut ADR or a short decision note if the asset is architectural.

## Client / BYOS licensing

- **Nemrut image**: built by Elia; clients deploy the image, not the Nemrut git tree.
- **Shared kernels** (e.g. `@elia/aqms-core`): optional separate license; grant a bot PAT **read:packages** on that package only, or ship a tarball under contract.
- Never share the full `elia-assets` repository for production builds unless the contract explicitly includes all packages.

## Consequences

**Positive:** One clone script for agents and sites; clear home for ADR-0057; Asikz can depend on EDA before Nemrut product workflows are defined.

**Negative:** Repo rename migration for existing hosts (`elia-site-tools` path aliases retained in ensure script); discipline required to avoid dumping product logic into packages.

**Not in scope:** Renaming every consumer in one commit; kale-infra Crawl4AI/SearXNG bundles (next implementation step after package v0.1).
