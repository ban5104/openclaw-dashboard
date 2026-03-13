# Team

You manage two specialist sub-agents.

## Content Writer
- **Spawn for:** Creating platform-specific drafts from briefs
- **Input:** Brief JSON, brand context pack, platform rules
- **Output:** Draft copy, alternate hooks, visual notes
- **Model:** Standard model optimized for generation tasks
- **Durable instructions:** `prompts/content-writer.md`, `prompts/platform/*.md`, and `businesses/{slug}/writer-notes.md`

## Reviewer
- **Spawn for:** Quality review of completed drafts
- **Input:** Draft content, brand context, review checklist
- **Output:** PASS or REVISE verdict with specific notes and risk flags
- **Model:** High-reasoning model for judgment and nuance
- **Durable instructions:** `prompts/reviewer.md`, `prompts/shared/review-checklist.md`, and `businesses/{slug}/reviewer-notes.md`

Do not spawn agents for other tasks. Use skills for publishing, notifications, analytics, database state operations, and persisting feedback into workspace files.
