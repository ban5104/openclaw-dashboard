ALTER TYPE content_state RENAME TO content_state_old;

CREATE TYPE content_state AS ENUM (
  'planned',
  'briefed',
  'drafting',
  'draft_ready',
  'in_review',
  'revision_required',
  'approved',
  'ready_to_post',
  'posted',
  'analyzed',
  'archived'
);

ALTER TABLE content_items
  ALTER COLUMN state DROP DEFAULT,
  ADD COLUMN suggested_time TEXT,
  ADD COLUMN IF NOT EXISTS boost_candidate BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS boost_reason TEXT;

ALTER TABLE content_versions
  ADD COLUMN IF NOT EXISTS image_prompt TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE content_items
  ALTER COLUMN state TYPE content_state
  USING (
    CASE
      WHEN state::text IN ('publishing_draft', 'draft_on_platform') THEN 'ready_to_post'
      WHEN state::text = 'notified' THEN 'posted'
      ELSE state::text
    END
  )::content_state;

ALTER TABLE audit_events
  ALTER COLUMN from_state TYPE content_state
  USING (
    CASE
      WHEN from_state::text IN ('publishing_draft', 'draft_on_platform') THEN 'ready_to_post'
      WHEN from_state::text = 'notified' THEN 'posted'
      ELSE from_state::text
    END
  )::content_state,
  ALTER COLUMN to_state TYPE content_state
  USING (
    CASE
      WHEN to_state::text IN ('publishing_draft', 'draft_on_platform') THEN 'ready_to_post'
      WHEN to_state::text = 'notified' THEN 'posted'
      ELSE to_state::text
    END
  )::content_state;

ALTER TABLE businesses DROP COLUMN IF EXISTS notification_channel;
ALTER TABLE content_items DROP COLUMN IF EXISTS platform_draft_id;
ALTER TABLE content_items DROP COLUMN IF EXISTS platform_draft_url;
ALTER TABLE content_items DROP COLUMN IF EXISTS platform_post_id;
ALTER TABLE content_items DROP COLUMN IF EXISTS platform_post_url;
ALTER TABLE content_items DROP COLUMN IF EXISTS published_draft_at;

DROP TYPE content_state_old;

ALTER TABLE content_items
  ALTER COLUMN state SET DEFAULT 'planned';

CREATE OR REPLACE FUNCTION validate_state_transition()
RETURNS TRIGGER AS $$
DECLARE
    valid_transitions JSONB := '{
        "planned": ["briefed"],
        "briefed": ["drafting"],
        "drafting": ["draft_ready"],
        "draft_ready": ["in_review"],
        "in_review": ["approved", "revision_required"],
        "revision_required": ["drafting"],
        "approved": ["ready_to_post"],
        "ready_to_post": ["posted"],
        "posted": ["analyzed"],
        "analyzed": ["archived"]
    }'::JSONB;
    allowed TEXT[];
BEGIN
    IF NEW.state = 'archived' THEN
        RETURN NEW;
    END IF;

    SELECT ARRAY(
        SELECT jsonb_array_elements_text(valid_transitions -> OLD.state::TEXT)
    ) INTO allowed;

    IF NEW.state::TEXT != ALL(allowed) THEN
        RAISE EXCEPTION 'Invalid state transition: % → %', OLD.state, NEW.state;
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
