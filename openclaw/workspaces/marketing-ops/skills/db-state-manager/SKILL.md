---
name: db-state-manager
description: Provide the only agent-facing interface for reading and mutating marketing content state in Postgres. Use for content item lookup, state transitions, version creation, review persistence, bulk planning inserts, and summary stats.
---

# DB State Manager

Supported actions:
- `read`
- `list`
- `transition`
- `create-version`
- `save-review`
- `bulk-create-items`
- `stats`

Rules:
- Enforce the Postgres state machine instead of bypassing it.
- Never let agents run raw SQL directly.
- Keep inputs and outputs JSON-shaped and stable.
- TODO: Add action schemas and DB queries for each operation.
