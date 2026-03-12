---
name: linkedin-publisher
description: Create LinkedIn draft posts from approved content items, save platform identifiers, and log publication state. Use when an approved LinkedIn content item should become a platform draft without publishing live.
---

# LinkedIn Publisher

- Accept `--content-item-id` and `--action create-draft`.
- Read the approved current version from Postgres.
- Call the LinkedIn Posts API with `lifecycleState: DRAFT`.
- Persist draft identifiers and audit records.
- Never publish live.
- TODO: Wire Postgres reads/writes and error logging.
- TODO: Validate required env before making API calls.
