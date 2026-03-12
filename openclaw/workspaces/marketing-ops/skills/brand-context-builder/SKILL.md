---
name: brand-context-builder
description: Parse a business brand profile and related workspace files into a compact JSON context pack for content-writer and reviewer tasks. Use when the orchestrator needs business context before spawning sub-agents.
---

# Brand Context Builder

- Read the business workspace under `businesses/<slug>/`.
- Parse `brand-profile.md` plus adjacent support files if present.
- Return concise JSON for prompt injection.
- Keep output compact and factual.
- TODO: Resolve `business_id` to slug from Postgres.
- TODO: Merge compliance, offers, audience, and examples into a normalized context pack.
- CLI target: `node index.js --business-id <uuid>`
