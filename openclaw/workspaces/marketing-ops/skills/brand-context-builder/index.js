#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
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

function resolveWorkspaceRoot() {
  const configured = process.env.OPENCLAW_WORKSPACE;
  if (configured) return configured.replace(/^~(?=$|\/)/, process.env.HOME || '');

  const repoLocal = path.resolve(__dirname, '..', '..');
  if (fs.existsSync(path.join(repoLocal, 'SOUL.md'))) {
    return repoLocal;
  }

  return path.resolve(process.env.HOME || '', '.openclaw/workspaces/marketing-ops');
}

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8').trim() : null;
}

function extractSections(markdown) {
  if (!markdown) return {};
  const sections = {};
  let current = null;
  let buffer = [];

  for (const line of markdown.split(/\r?\n/)) {
    if (line.startsWith('## ')) {
      if (current) sections[current] = buffer.join('\n').trim();
      current = line.replace(/^##\s+/, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
      buffer = [];
    } else {
      buffer.push(line);
    }
  }

  if (current) sections[current] = buffer.join('\n').trim();
  return sections;
}

function bullets(markdown) {
  if (!markdown) return [];
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, '').trim());
}

function getNestedSection(markdown, heading) {
  if (!markdown) return null;
  const lines = markdown.split(/\r?\n/);
  const needle = `## ${heading}`;
  const start = lines.findIndex((line) => line.trim() === needle);
  if (start === -1) return null;
  const body = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith('## ')) break;
    body.push(lines[i]);
  }
  return body.join('\n').trim();
}

async function resolveBusiness(pool, args) {
  if (args.slug) {
    return { slug: args.slug, id: args['business-id'] || null, enabledPlatforms: [], postingCadence: null, name: args.slug };
  }

  if (!args['business-id']) {
    return { slug: process.env.BUSINESS_SLUG || 'nelsonai', id: null, enabledPlatforms: [], postingCadence: null, name: 'NelsonAI' };
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required when using --business-id without --slug');
  }

  const { rows } = await pool.query(
    'SELECT id, slug, name, enabled_platforms, posting_cadence FROM businesses WHERE id = $1 LIMIT 1',
    [args['business-id']],
  );
  if (!rows[0]) throw new Error(`Business not found: ${args['business-id']}`);
  return {
    slug: rows[0].slug,
    id: rows[0].id,
    name: rows[0].name,
    enabledPlatforms: rows[0].enabled_platforms || [],
    postingCadence: rows[0].posting_cadence || null,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const workspaceRoot = resolveWorkspaceRoot();
  const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;

  try {
    const business = await resolveBusiness(pool, args);
    const businessDir = path.resolve(workspaceRoot, 'businesses', business.slug);
    const brandProfile = readIfExists(path.join(businessDir, 'brand-profile.md'));
    const compliance = readIfExists(path.join(businessDir, 'compliance.md'));
    const offers = readIfExists(path.join(businessDir, 'offers.md'));
    const audience = readIfExists(path.join(businessDir, 'audience.md'));
    const winningPosts = readIfExists(path.join(businessDir, 'examples', 'winning-posts.md'));
    const avoidedPosts = readIfExists(path.join(businessDir, 'examples', 'avoided-posts.md'));

    if (!brandProfile) {
      throw new Error(`Missing brand profile: ${path.join(businessDir, 'brand-profile.md')}`);
    }

    const profileSections = extractSections(brandProfile);
    const output = {
      business_id: business.id,
      business_slug: business.slug,
      business_name: business.name,
      company_summary: profileSections.company_summary || '',
      positioning: profileSections.positioning || '',
      tone_and_voice: profileSections.tone_voice || profileSections.tone_and_voice || '',
      approved_claims: bullets(getNestedSection(brandProfile, 'Approved Claims')),
      forbidden_claims: bullets(getNestedSection(brandProfile, 'Forbidden Claims')),
      cta_preferences: getNestedSection(brandProfile, 'CTA Preferences') || '',
      target_audience: audience || profileSections.target_audience || '',
      offers: offers || profileSections.offers || '',
      compliance: compliance || '',
      examples: {
        winning: winningPosts || '',
        avoided: avoidedPosts || '',
      },
      enabled_platforms: business.enabledPlatforms || [],
      posting_cadence: business.postingCadence || null,
      source_files: {
        brand_profile: path.join(businessDir, 'brand-profile.md'),
        compliance: path.join(businessDir, 'compliance.md'),
        offers: path.join(businessDir, 'offers.md'),
        audience: path.join(businessDir, 'audience.md'),
      },
    };

    console.log(JSON.stringify(output, null, 2));
  } finally {
    if (pool) await pool.end();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ error: error.message }, null, 2));
  process.exit(1);
});
