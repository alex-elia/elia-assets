# @elia/aqms-core

## Install (consumers)

Shipped alone on GitHub Packages (`@elia` scope). Clients do not need the `elia-assets` monorepo.

```ini
# .npmrc
@elia:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=<PAT with read:packages>
```

```bash
npm install @elia/aqms-core@0.1.0
```

Release: tag `aqms-core-v0.1.0` on `elia-assets` (workflow `publish-aqms-core.yml`).

## Technical kernel for Agent Quality Management System (AQMS): shared types, deterministic check finalization, export gate helpers, calibration and agreement math, and host rubric YAML parsing.

**Not included (host / Nemrut):** Supabase persistence, module adapters, Edge hooks, admin dashboard UI, judge LLM calls.

See Nemrut [SPEC-0050](https://github.com/alex-elia/nemrut/blob/develop/docs/specifications/SPEC-0050-agent-quality-management-system.md) and [ADR-0050](https://github.com/alex-elia/nemrut/blob/develop/docs/adr/0050-agent-quality-management-system.md).
