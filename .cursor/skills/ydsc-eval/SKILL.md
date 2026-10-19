---
name: ydsc-eval
description: Run and interpret the Yekdusecar agent eval harness (Track A stack checks, Track B Cursor SDK cases). Use when the user mentions harness, eval, smoke case, golden prompts, Track A, Track B, or checking that shared AGENTS.md rules still hold.
---

# YDSC eval harness

Canonical runner lives in `yekdusecar`. Do not invent a parallel eval script in a host repo. Do not use this harness for Nemrut AQMS or kizil-rag retrieval scores.

## Tracks

- **Track A** (default, `npm run eval`): no LLM. Checks factory skills and that each host in `harness/hosts.json` still has the `ydsc-agent-rules` block.
- **Track B** (`npm run eval:live`): Cursor SDK `Agent.prompt` against golden cases. Requires `CURSOR_API_KEY`. Keep prompts read-only.

## Run

From the yekdusecar root:

```bash
npm install
npm run eval
npm run eval:live
```

Never commit `.env`.

## Cases

JSON files in `harness/cases/`. Each case sets `"track": "A"` or `"B"`.

Track A kinds: `fileContains`, `filesExist`, `hostsFileContains`.
Track B fields: `prompt`, `expectAll` / `expectAny`, optional `cwd`, `forbidSubstrings`.

## When adding a case

1. Add `harness/cases/<id>.json` with `id` and `track`.
2. Track B prompts must not ask the eval agent to commit or edit product code.
3. Run the matching npm script and confirm pass before treating the case as live.

## Interpreting results

- Pass: checks or expected strings succeeded.
- Fail: print the case id and missing strings. Do not weaken the case unless the user asks.
