# Ticket Template. Reference for write-backlog-ticket skill

Write the issue body in English.

## Bug template

```
## Context
[1-2 sentences: which module, which screen, under which conditions]

## Priority
[Critical / High / Medium / Low]

## Reproduction steps
1. ...
2. ...
3. ...

## Actual result
[What happens today]

## Expected result
[What should happen]

## Acceptance criteria
- [ ] [Verifiable, testable condition 1]
- [ ] [Verifiable, testable condition 2]

## Test to add/run
[Exact test file to create or change, or the exact manual verification command]

## Out of scope
[What the agent must NOT touch, even if it seems related]
```

### Concrete example (good level of detail)

```
## Context
Nemrut document indexing, when uploading a 5.8MB scanned safety notice PDF.

## Priority
Critical

## Reproduction steps
1. Open the document upload screen
2. Upload a PDF larger than 5MB that contains scanned images
3. Watch the indexing status

## Actual result
Indexing fails silently or stays stuck on "in progress". A retry is inconsistent (sometimes succeeds, sometimes fails).

## Expected result
The PDF indexes successfully in under 30 seconds, or the UI shows an explicit, actionable error if the file is invalid.

## Acceptance criteria
- [ ] A 5.8MB PDF with scanned images indexes in under 30s with no error
- [ ] A retry on the same file produces the same result (no flakiness)
- [ ] An explicit error is shown if the file exceeds the real technical limit

## Test to add/run
tests/indexing/pdf-large-file.spec.ts: case with a fixture PDF >5MB

## Out of scope
Do not change the PNG image indexing pipeline (separate ticket BUG-04).
```

## Feature template

```
## Context
[Why this need exists, which business use]

## User story
As a [role], I want [action], so that [benefit].

## Acceptance criteria
- [ ] ...
- [ ] ...

## Test to add/run
[...]

## Out of scope
[...]
```

## Cross-cutting rules
- No section may stay empty or use generic wording ("it should work better").
- Each acceptance criterion must be verifiable without subjective human judgment.
- If the ticket touches more than 3 unrelated files or modules, split it into sub-issues.
