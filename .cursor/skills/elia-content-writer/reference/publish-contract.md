# Elia Studio blog publish contract (elia-content-writer v1.4)

Repo: **alex-elia/elia-studio**. Branch: **master** (Vercel production).

## Allowlist

| Path | Purpose |
|------|---------|
| `content/en/blog/<slug>.md` | English article |
| `content/fr/blog/<slug>.md` | French article |
| `public/images/insights/*` | Heroes, diagrams |

Do not edit `src/`, config, or secrets unless explicitly requested.

## Front matter (required)

```yaml
---
title: "..."
description: "..." # meta, <= ~155 chars
date: "YYYY-MM-DD"
dateModified: "YYYY-MM-DD"
author: Alexandre Gon
authorRole: Founder, Elia Studio  # or Fondateur, Elia Studio
og_image: /images/insights/<file>
translationKey: <shared-id>
alternateSlug:
  fr: <fr-slug>   # on EN file
  # en: <en-slug> # on FR file
faq:
  - question: "..."
    answer: "..."
---
```

Dates must be quoted strings. Slug = filename without `.md`.

## Body rules

- No `# H1` in body (title is front matter).
- Open with **answer block** (bold).
- No JSON-LD, no "publishing package", no `[PLANNED]` links when publishing.
- Internal links: `/services`, `/contact`, `/about`, `/references`, `/blog`.

## Images

- Store under `public/images/insights/`.
- Reference in markdown: `![alt](/images/insights/file.webp)`.
- Diagram caption: note if AI-generated for clarity.

## Validate and deploy

```bash
npm run content:validate
git commit -m "content: publish <topic> (en, fr)"
git push origin master
```

After deploy: check https://www.elia-studio.eu/blog and FR twin URLs.

Full skill: `yekdusecar/skills/elia-content-writer-v1.4.md` or `docs/agents/elia-content-writer.md` in elia-studio.
