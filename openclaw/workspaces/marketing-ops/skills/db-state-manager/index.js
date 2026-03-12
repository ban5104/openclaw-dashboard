#!/usr/bin/env node
const { Pool } = require('pg');

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
    out[key.slice(2)] = value;
  }
  return out;
}

function parseJsonArg(value, fallback = {}) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Invalid JSON: ${value}`);
  }
}

async function readStdin() {
  if (process.stdin.isTTY) return null;
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8').trim();
  return text || null;
}

function currentTimestampField(toState) {
  const map = {
    briefed: 'briefed_at',
    draft_ready: 'first_draft_at',
    approved: 'approved_at',
    ready_to_post: 'approved_at',
    posted: 'posted_at',
    analyzed: 'analyzed_at',
  };
  return map[toState] || null;
}

async function fetchItem(pool, id) {
  const { rows } = await pool.query(
    `SELECT ci.*, b.name AS business_name, b.slug AS business_slug
       FROM content_items ci
       JOIN businesses b ON b.id = ci.business_id
      WHERE ci.id = $1
      LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

async function actionRead(pool, args) {
  const id = args.id || args['content-item-id'];
  if (!id) throw new Error('read requires --id or --content-item-id');

  const item = await fetchItem(pool, id);
  if (!item) throw new Error(`Content item not found: ${id}`);

  const [versions, reviews] = await Promise.all([
    pool.query('SELECT * FROM content_versions WHERE content_item_id = $1 ORDER BY version_number DESC', [id]),
    pool.query('SELECT * FROM review_records WHERE content_item_id = $1 ORDER BY created_at DESC', [id]),
  ]);

  return {
    item,
    versions: versions.rows,
    reviews: reviews.rows,
  };
}

async function actionList(pool, args) {
  const filters = parseJsonArg(args.filters, {});
  const values = [];
  const where = [];

  if (filters.business_id) {
    values.push(filters.business_id);
    where.push(`business_id = $${values.length}`);
  }
  if (filters.state) {
    values.push(filters.state);
    where.push(`state = $${values.length}`);
  }
  if (filters.platform) {
    values.push(filters.platform);
    where.push(`platform = $${values.length}`);
  }

  const sql = `SELECT * FROM content_items ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY scheduled_date ASC NULLS LAST, created_at DESC LIMIT 100`;
  const { rows } = await pool.query(sql, values);
  return { items: rows };
}

async function actionTransition(pool, args) {
  const id = args.id || args['content-item-id'];
  const toState = args['to-state'] || args.to_state;
  const actor = args.actor || 'orchestrator';
  if (!id || !toState) throw new Error('transition requires --content-item-id and --to-state');

  const item = await fetchItem(pool, id);
  if (!item) throw new Error(`Content item not found: ${id}`);

  const timestampField = currentTimestampField(toState);
  const updateSql = timestampField
    ? `UPDATE content_items SET state = $1, ${timestampField} = now(), updated_at = now() WHERE id = $2 RETURNING *`
    : 'UPDATE content_items SET state = $1, updated_at = now() WHERE id = $2 RETURNING *';

  const { rows } = await pool.query(updateSql, [toState, id]);

  await pool.query(
    `INSERT INTO audit_events (business_id, content_item_id, actor, action, from_state, to_state, details)
     VALUES ($1, $2, $3, 'state_transition', $4, $5, $6::jsonb)`,
    [item.business_id, id, actor, item.state, toState, JSON.stringify({ via: 'db-state-manager' })],
  );

  return { item: rows[0] };
}

async function actionCreateVersion(pool, args, stdinText) {
  const id = args['content-item-id'] || args.id;
  if (!id) throw new Error('create-version requires --content-item-id');
  const payload = stdinText ? JSON.parse(stdinText) : parseJsonArg(args.payload);
  if (!payload.body) throw new Error('create-version payload must include body');

  const nextVersionResult = await pool.query(
    'SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version FROM content_versions WHERE content_item_id = $1',
    [id],
  );
  const versionNumber = Number(nextVersionResult.rows[0].next_version);

  const created = await pool.query(
    `INSERT INTO content_versions (
      content_item_id, version_number, body, headline, visual_notes, alt_hooks, metadata,
      created_by, model_used, prompt_tokens, completion_tokens
    ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11)
    RETURNING *`,
    [
      id,
      versionNumber,
      payload.body,
      payload.headline || null,
      payload.visual_notes || null,
      payload.alt_hooks || [],
      JSON.stringify(payload.metadata || {}),
      payload.created_by || args.actor || 'content-writer',
      payload.model_used || null,
      payload.prompt_tokens || null,
      payload.completion_tokens || null,
    ],
  );

  await pool.query(
    `UPDATE content_items
        SET current_version_id = $1,
            state = 'draft_ready',
            first_draft_at = COALESCE(first_draft_at, now()),
            updated_at = now()
      WHERE id = $2`,
    [created.rows[0].id, id],
  );

  return { version: created.rows[0] };
}

async function actionSaveReview(pool, args, stdinText) {
  const id = args['content-item-id'] || args.id;
  if (!id) throw new Error('save-review requires --content-item-id');
  const payload = stdinText ? JSON.parse(stdinText) : parseJsonArg(args.payload);
  const item = await fetchItem(pool, id);
  if (!item) throw new Error(`Content item not found: ${id}`);
  if (!item.current_version_id) throw new Error('Content item has no current_version_id');

  const outcome = payload.outcome;
  const nextState = outcome === 'pass' ? 'approved' : outcome === 'revise' ? 'revision_required' : item.state;

  const inserted = await pool.query(
    `INSERT INTO review_records (
      content_version_id, content_item_id, outcome, brand_fit, claim_safety, platform_fit,
      clarity_score, revision_notes, risk_flags, confidence, reviewer_agent,
      model_used, prompt_tokens, completion_tokens
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    RETURNING *`,
    [
      item.current_version_id,
      id,
      outcome,
      payload.brand_fit ?? null,
      payload.claim_safety ?? null,
      payload.platform_fit ?? null,
      payload.clarity_score ?? null,
      payload.revision_notes ?? null,
      payload.risk_flags || [],
      payload.confidence ?? null,
      payload.reviewer_agent || args.actor || 'reviewer',
      payload.model_used || null,
      payload.prompt_tokens || null,
      payload.completion_tokens || null,
    ],
  );

  if (nextState !== item.state) {
    const timestampField = currentTimestampField(nextState);
    const updateSql = timestampField
      ? `UPDATE content_items SET state = $1, ${timestampField} = now(), updated_at = now() WHERE id = $2`
      : 'UPDATE content_items SET state = $1, updated_at = now() WHERE id = $2';
    await pool.query(updateSql, [nextState, id]);
  }

  await pool.query(
    `INSERT INTO audit_events (business_id, content_item_id, actor, action, from_state, to_state, details)
     VALUES ($1, $2, $3, 'review_completed', $4, $5, $6::jsonb)`,
    [item.business_id, id, payload.reviewer_agent || 'reviewer', item.state, nextState, JSON.stringify(payload)],
  );

  return { review: inserted.rows[0], next_state: nextState };
}

async function actionBulkCreateItems(pool, args, stdinText) {
  const payload = stdinText ? JSON.parse(stdinText) : parseJsonArg(args.payload);
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) throw new Error('bulk-create-items requires payload.items[]');

  const created = [];
  for (const item of items) {
    const { rows } = await pool.query(
      `INSERT INTO content_items (business_id, platform, state, campaign_theme, brief, scheduled_date, priority)
       VALUES ($1,$2,COALESCE($3,'planned'),$4,$5::jsonb,$6,$7)
       RETURNING *`,
      [
        item.business_id,
        item.platform,
        item.state || 'planned',
        item.campaign_theme || null,
        JSON.stringify(item.brief || {}),
        item.scheduled_date || null,
        item.priority || 'normal',
      ],
    );
    created.push(rows[0]);
  }

  return { items: created };
}

async function actionStats(pool, args) {
  const businessId = args['business-id'] || args.business_id;
  if (!businessId) throw new Error('stats requires --business-id');
  const { rows } = await pool.query(
    `SELECT state, COUNT(*)::int AS count
       FROM content_items
      WHERE business_id = $1
      GROUP BY state
      ORDER BY state`,
    [businessId],
  );
  return { counts: rows };
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const args = parseArgs(process.argv);
  const stdinText = await readStdin();
  const action = args.action;
  if (!action) throw new Error('Missing --action');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    let result;
    if (action === 'read') result = await actionRead(pool, args);
    else if (action === 'list') result = await actionList(pool, args);
    else if (action === 'transition') result = await actionTransition(pool, args);
    else if (action === 'create-version') result = await actionCreateVersion(pool, args, stdinText);
    else if (action === 'save-review') result = await actionSaveReview(pool, args, stdinText);
    else if (action === 'bulk-create-items') result = await actionBulkCreateItems(pool, args, stdinText);
    else if (action === 'stats') result = await actionStats(pool, args);
    else throw new Error(`Unsupported action: ${action}`);

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ error: error.message }, null, 2));
  process.exit(1);
});
