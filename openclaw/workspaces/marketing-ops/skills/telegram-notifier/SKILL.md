---
name: telegram-notifier
description: Send formatted Telegram notifications for draft-ready, revision-required, stale-item, weekly-plan, and error events. Use when the orchestrator needs to alert Ben or provide actionable deep links.
---

# Telegram Notifier

- Format event-specific Telegram messages.
- Support inline keyboard buttons for draft links, dashboard links, and mark-posted callbacks.
- TODO: Load event data from Postgres and render the correct template.
- TODO: Send via Telegram Bot API and persist notification_events delivery state.
