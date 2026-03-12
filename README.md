# Marketing Operations Dashboard

A Next.js visibility dashboard for the marketing operations system described in [`spec.md`](./spec.md). It keeps the upstream OpenClaw gateway client and ops/admin pages, while adding a Postgres-backed ready-to-post queue, calendar, analytics, agent roster, and business settings.

## What This Repo Owns

- Marketing dashboard pages for queue, calendar, analytics, agent overview, and settings
- Postgres/Prisma schema for the simplified content lifecycle, reviews, analytics, and audit history
- Internal API routes for content items, transitions, analytics, businesses, and brand profiles
- OpenClaw workspace templates aligned to the Telegram-first orchestrator workflow
- Seed script for a local NelsonAI demo dataset

## What This Repo Does Not Own

- The live OpenClaw installation in `~/.openclaw/...`
- Lobster workflow execution runtime
- Production infra and secrets management

## OpenClaw Templates Included In This Repo

The repo now includes spec-aligned OpenClaw scaffolding under `openclaw/` so the dashboard and agent setup can ship together:

- `openclaw/config/marketing-ops.config.json5` — gateway config template
- `openclaw/workspaces/marketing-ops/` — orchestrator workspace files
- `openclaw/workspaces/marketing-ops/businesses/nelsonai/` — NelsonAI brand/context files
- `openclaw/workspaces/marketing-ops/skills/` — repo-shipped OpenClaw skills for brand context, analytics, notifications, and DB state
- `openclaw/workspaces/marketing-ops/skills/workflows/` — Lobster workflow YAML scaffolds

These are templates/source-controlled assets. Copy or sync them into `~/.openclaw/` for a live install.

## Stack

- Next.js 16 App Router
- React 19
- Prisma ORM with PostgreSQL
- Existing OpenClaw gateway WebSocket client and hooks from the upstream dashboard
- Tailwind CSS v4

## Setup

```bash
npm install
cp .env.example .env.local
```

To sync the repo's OpenClaw templates into a local install:

```bash
npm run openclaw:sync
```

Required environment values:

```bash
DATABASE_URL=
OPENCLAW_GATEWAY_WS_URL=ws://localhost:18789
ADMIN_SECRET=
DASHBOARD_URL=http://localhost:3000
```

Optional integrations:

```bash
LINKEDIN_ACCESS_TOKEN=
LINKEDIN_ORG_ID=
FACEBOOK_PAGE_ID=
FACEBOOK_PAGE_ACCESS_TOKEN=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_WEBHOOK_SECRET=
```

These same environment values are also required by the repo-shipped OpenClaw skills under `openclaw/workspaces/marketing-ops/skills/` when you run them against a live OpenClaw install.

## Database

Generate the Prisma client:

```bash
npm run prisma:generate
```

Apply the migration to a configured PostgreSQL database:

```bash
npx prisma migrate deploy
```

Seed a local demo dataset:

```bash
npm run db:seed
```

## Development

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
```

## Routes

Marketing pages:

- `/queue`
- `/items/[id]`
- `/calendar`
- `/analytics`
- `/agents-overview`
- `/settings`

Inherited OpenClaw ops pages:

- `/overview`
- `/chat`
- `/agents`
- `/sessions`
- `/models`
- `/skills`
- `/channels`
- `/cron`
- `/config`
- `/logs`

## Notes

- If `DATABASE_URL` is missing or unreachable, the marketing pages fall back to realistic demo data so the UI remains usable.
- Mutating API routes are protected by `ADMIN_SECRET` when it is set.
- Telegram is the primary interface for approvals and feedback. The dashboard is intentionally visibility-first and does not own publishing.
