CREATE TYPE creative_asset_source AS ENUM ('owned', 'past_post', 'reference', 'stock');
CREATE TYPE creative_asset_status AS ENUM ('active', 'archived');

CREATE TABLE creative_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    source_type creative_asset_source NOT NULL DEFAULT 'owned',
    status creative_asset_status NOT NULL DEFAULT 'active',
    title TEXT NOT NULL,
    asset_url TEXT NOT NULL,
    thumbnail_url TEXT,
    mime_type TEXT,
    caption TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    platform_hints JSONB NOT NULL DEFAULT '{}',
    embedding_model TEXT,
    embedding JSONB,
    embedding_generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (business_id, asset_url)
);

CREATE INDEX idx_creative_assets_business_status
    ON creative_assets (business_id, status);

CREATE TABLE content_asset_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    content_version_id UUID NOT NULL REFERENCES content_versions(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES creative_assets(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    similarity_score DOUBLE PRECISION NOT NULL,
    rationale TEXT,
    selected BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (content_version_id, asset_id),
    UNIQUE (content_version_id, rank)
);

CREATE INDEX idx_content_asset_matches_item_time
    ON content_asset_matches (content_item_id, created_at DESC);

DROP TRIGGER IF EXISTS set_creative_assets_updated_at ON creative_assets;
CREATE TRIGGER set_creative_assets_updated_at
    BEFORE UPDATE ON creative_assets
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
