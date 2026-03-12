---
name: facebook-publisher
description: Create unpublished Facebook Page draft posts from approved content items and save platform state back to Postgres. Use when an approved Facebook content item should be prepared for manual publishing.
---

# Facebook Publisher

- Accept `--content-item-id` and `--action create-draft`.
- Read approved content from Postgres.
- Create an unpublished post with `published=false`.
- Persist identifiers and audit data.
- Never publish live.
- TODO: Wire database IO and Graph API call flow.
