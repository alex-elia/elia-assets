---
name: write-backlog-ticket
description: Use this skill whenever creating, refining, or triaging a GitHub issue/backlog ticket (bug, feature, or chore) so it becomes executable by an autonomous coding agent without further clarification. Trigger on requests like "create a ticket", "add this to the backlog", "turn these meeting notes into issues", "crée un ticket", "ajoute ça au backlog", or when reviewing existing issues with vague or missing content.
---

# Write Backlog Ticket

## Description
Transforms a raw idea, bug report, or meeting note into a self-sufficient GitHub issue that an autonomous coding agent (Cursor Cloud Agent, Claude Code, Codex) can execute end-to-end and self-verify, without requiring back-and-forth clarification with the human.

## Inputs required
- Raw source: a sentence, a meeting note, a bug description, or an existing under-specified issue.
- Repo context: which repo/module this belongs to (nemrut, matia-seo, clin, etc.) if not obvious.
- Type: bug, feature, or chore (ask if ambiguous. Do not guess silently).

## Process steps

1. **Classify** the ticket type (bug / feature / chore) and assign a priority (Critical / High / Medium / Low) based on user impact and blocking severity.
2. **Write the title** using the pattern `TYPE-NN: Short outcome-oriented summary` (e.g. `BUG-01: PDF indexing fails on files >5MB`). Avoid vague titles like "improve X" or "fix Y" without a concrete symptom.
3. **Fill the body using the template in `reference/ticket-template.md`**. Every section is mandatory. None can be left as a placeholder:
   - Context (1-2 lines: where/when this occurs)
   - Reproduction steps (bug) OR User story (feature). Numbered, concrete, no ambiguity
   - Actual result vs Expected result
   - Acceptance criteria. A checklist of verifiable, testable conditions. Each item must be objectively checkable by the agent itself (e.g. "a 5.8MB file indexes without error in under 30s", not "it works better")
   - Test to add/run. Name the exact test file or manual verification command
   - Out of scope. Explicitly list what NOT to touch, to prevent scope creep
4. **Check independence**: verify this ticket does not touch the same files/modules as other open tickets planned for parallel execution. If overlap is likely, flag it explicitly in a "Potential conflict" note instead of silently proceeding.
5. **Size check**: if the acceptance criteria require touching more than ~3 unrelated files or modules, split into sub-issues instead of shipping one large ticket.
6. **Output**: return the finished issue title + body in Markdown, ready to paste or push via the GitHub tool. Never leave TODO placeholders in the output.

## Output specification
A single Markdown block: `## Title` followed by the full issue body following the mandatory template, with all sections filled in concrete, testable language. Never generic or vague statements.

Ticket body language is English, even if the user request was in French.

## Reference files
- `reference/ticket-template.md`: the mandatory section template with examples for both bug and feature tickets.
