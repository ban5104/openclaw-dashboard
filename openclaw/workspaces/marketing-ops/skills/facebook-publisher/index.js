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

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.action !== 'create-draft') throw new Error('Only --action create-draft is supported');
  const contentItemId = args['content-item-id'];
  if (!contentItemId) throw new Error('Missing --content-item-id');
  requiredEnv('DATABASE_URL');
  const pageId = requiredEnv('FACEBOOK_PAGE_ID');
  const accessToken = requiredEnv('FACEBOOK_PAGE_ACCESS_TOKEN');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const { rows } = await pool.query(
      `SELECT ci.*, cv.body, cv.headline
         FROM content_items ci
         JOIN content_versions cv ON cv.id = ci.current_version_id
        WHERE ci.id = $1
        LIMIT 1`,
      [contentItemId],
    );
    const item = rows[0];
    if (!item) throw new Error(`Content item not found: ${contentItemId}`);
    if (item.platform !== 'facebook') throw new Error(`Content item platform is ${item.platform}, not facebook`);
    if (item.state !== 'approved') throw new Error(`Content item must be in approved state, found ${item.state}`);

    const body = new URLSearchParams({
      message: item.body,
      published: 'false',
      access_token: accessToken,
    });

    const response = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const responseJson = await response.json().catch(() => ({}));
    if (!response.ok || responseJson.error) {
      await pool.query(
        `INSERT INTO platform_publications (content_item_id, platform, action, error, api_response)
         VALUES ($1, 'facebook', 'draft_created', $2, $3::jsonb)`,
        [contentItemId, `HTTP ${response.status}`, JSON.stringify(responseJson)],
      );
      throw new Error(`Facebook API error: ${response.status} ${JSON.stringify(responseJson)}`);
    }

    const draftId = responseJson.id || null;
    const draftUrl = draftId ? `https://www.facebook.com/${draftId}` : null;

    await pool.query(
      `UPDATE content_items
          SET platform_draft_id = $1,
              platform_draft_url = $2,
              state = 'draft_on_platform',
              published_draft_at = now(),
              updated_at = now()
        WHERE id = $3`,
      [draftId, draftUrl, contentItemId],
    );

    await pool.query(
      `INSERT INTO platform_publications (content_item_id, platform, action, platform_id, platform_url, api_response)
       VALUES ($1, 'facebook', 'draft_created', $2, $3, $4::jsonb)`,
      [contentItemId, draftId, draftUrl, JSON.stringify(responseJson)],
    );

    await pool.query(
      `INSERT INTO audit_events (business_id, content_item_id, actor, action, from_state, to_state, details)
       VALUES ($1, $2, 'facebook-publisher', 'state_transition', 'approved', 'draft_on_platform', $3::jsonb)`,
      [item.business_id, contentItemId, JSON.stringify({ draft_id: draftId, draft_url: draftUrl })],
    );

    console.log(JSON.stringify({ draft_id: draftId, draft_url: draftUrl }, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ error: error.message }, null, 2));
  process.exit(1);
});
