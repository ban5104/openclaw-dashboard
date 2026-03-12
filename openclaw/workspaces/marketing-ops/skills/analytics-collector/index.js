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

async function collectLinkedIn(platformPostId) {
  const token = requiredEnv('LINKEDIN_ACCESS_TOKEN');
  const response = await fetch(`https://api.linkedin.com/rest/posts/${platformPostId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'LinkedIn-Version': '202503',
      'X-Restli-Protocol-Version': '2.0.0',
    },
  });
  const raw = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`LinkedIn analytics fetch failed: ${response.status}`);
  return {
    impressions: typeof raw.impressionCount === 'number' ? raw.impressionCount : null,
    clicks: typeof raw.clickCount === 'number' ? raw.clickCount : null,
    likes: typeof raw.likeCount === 'number' ? raw.likeCount : null,
    comments: typeof raw.commentCount === 'number' ? raw.commentCount : null,
    shares: typeof raw.shareCount === 'number' ? raw.shareCount : null,
    reach: typeof raw.uniqueImpressionsCount === 'number' ? raw.uniqueImpressionsCount : (typeof raw.impressionCount === 'number' ? raw.impressionCount : null),
    raw,
  };
}

async function collectFacebook(platformPostId) {
  const token = requiredEnv('FACEBOOK_PAGE_ACCESS_TOKEN');
  const fields = 'post_impressions,post_reactions_by_type_total,post_clicks,post_engaged_users';
  const response = await fetch(`https://graph.facebook.com/v23.0/${platformPostId}/insights?metric=${fields}&access_token=${token}`);
  const raw = await response.json().catch(() => ({}));
  if (!response.ok || raw.error) throw new Error(`Facebook analytics fetch failed: ${response.status}`);
  const list = Array.isArray(raw.data) ? raw.data : [];
  const metric = (name) => {
    const hit = list.find((entry) => entry && entry.name === name);
    const value = hit && hit.values && hit.values[0] ? hit.values[0].value : null;
    return typeof value === 'number' ? value : null;
  };
  return {
    impressions: metric('post_impressions'),
    clicks: metric('post_clicks'),
    likes: null,
    comments: null,
    shares: null,
    reach: metric('post_impressions'),
    raw,
  };
}

async function snapshotForItem(item) {
  if (item.platform === 'linkedin') return collectLinkedIn(item.platform_post_id);
  if (item.platform === 'facebook') return collectFacebook(item.platform_post_id);
  throw new Error(`Unsupported analytics platform: ${item.platform}`);
}

async function main() {
  const args = parseArgs(process.argv);
  const action = args.action;
  requiredEnv('DATABASE_URL');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    if (action !== 'collect' && action !== 'weekly-summary') {
      throw new Error('Supported actions: collect, weekly-summary');
    }

    const businessId = args['business-id'] || null;
    const filters = [];
    const values = [];
    if (businessId) {
      values.push(businessId);
      filters.push(`business_id = $${values.length}`);
    }
    filters.push(`state = 'posted'`);
    filters.push(`platform_post_id IS NOT NULL`);

    const { rows: items } = await pool.query(
      `SELECT id, business_id, platform, platform_post_id, campaign_theme
         FROM content_items
        WHERE ${filters.join(' AND ')}`,
      values,
    );

    const snapshots = [];
    for (const item of items) {
      try {
        const metrics = await snapshotForItem(item);
        const { rows } = await pool.query(
          `INSERT INTO analytics_snapshots (
            content_item_id, business_id, platform, snapshot_date, impressions, clicks, likes, comments, shares, reach, raw_data
          ) VALUES ($1,$2,$3,CURRENT_DATE,$4,$5,$6,$7,$8,$9,$10::jsonb)
          ON CONFLICT (content_item_id, snapshot_date)
          DO UPDATE SET impressions = EXCLUDED.impressions,
                        clicks = EXCLUDED.clicks,
                        likes = EXCLUDED.likes,
                        comments = EXCLUDED.comments,
                        shares = EXCLUDED.shares,
                        reach = EXCLUDED.reach,
                        raw_data = EXCLUDED.raw_data
          RETURNING *`,
          [item.id, item.business_id, item.platform, metrics.impressions, metrics.clicks, metrics.likes, metrics.comments, metrics.shares, metrics.reach, JSON.stringify(metrics.raw)],
        );
        await pool.query(
          `UPDATE content_items SET state = 'analyzed', analyzed_at = now(), updated_at = now() WHERE id = $1`,
          [item.id],
        );
        await pool.query(
          `INSERT INTO audit_events (business_id, content_item_id, actor, action, from_state, to_state, details)
           VALUES ($1, $2, 'analytics-collector', 'analytics_collected', 'posted', 'analyzed', $3::jsonb)`,
          [item.business_id, item.id, JSON.stringify({ platform: item.platform })],
        );
        snapshots.push(rows[0]);
      } catch (error) {
        snapshots.push({ item_id: item.id, error: error.message, platform: item.platform });
      }
    }

    if (action === 'weekly-summary') {
      const { rows: summaryRows } = await pool.query(
        `SELECT b.id AS business_id, b.name AS business_name, COUNT(a.id)::int AS count,
                COALESCE(SUM(a.impressions),0)::int AS impressions,
                COALESCE(SUM(a.clicks),0)::int AS clicks
           FROM businesses b
           LEFT JOIN analytics_snapshots a ON a.business_id = b.id AND a.snapshot_date >= CURRENT_DATE - INTERVAL '7 days'
          ${businessId ? 'WHERE b.id = $1' : ''}
          GROUP BY b.id, b.name`,
        businessId ? [businessId] : [],
      );
      console.log(JSON.stringify({ snapshots, summary: summaryRows }, null, 2));
      return;
    }

    console.log(JSON.stringify({ snapshots }, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ error: error.message }, null, 2));
  process.exit(1);
});
