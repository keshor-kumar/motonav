-- MotoNav Moto Community schema (text chat + audio messages).
-- Idempotent: safe to re-run. Does NOT touch riders / rides / ride_members.
-- The server connects with DATABASE_URL (a trusted server-side connection), so access control is
-- enforced by the API (community token + membership checks). RLS is enabled with no policies so the
-- Supabase public (anon / authenticated) API roles cannot read or write these tables directly.

CREATE TABLE IF NOT EXISTS communities (
  id           UUID PRIMARY KEY,
  code         TEXT        NOT NULL UNIQUE CHECK (code ~ '^MN[A-Z0-9]{3,14}$'),
  name         TEXT        NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  description  TEXT        NOT NULL DEFAULT '' CHECK (char_length(description) <= 200),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_members (
  id            UUID PRIMARY KEY,
  community_id  UUID        NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  is_creator    BOOLEAN     NOT NULL DEFAULT FALSE,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Display names are unique per community, case-insensitively (no accounts, so this stops impersonation).
CREATE UNIQUE INDEX IF NOT EXISTS uq_community_members_name
  ON community_members (community_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_community_members_community ON community_members (community_id);

CREATE TABLE IF NOT EXISTS community_messages (
  id                  UUID PRIMARY KEY,
  community_id        UUID        NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  member_id           UUID        NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  sender_name         TEXT        NOT NULL,
  type                TEXT        NOT NULL CHECK (type IN ('text', 'audio')),
  text                TEXT        CHECK (text IS NULL OR char_length(text) BETWEEN 1 AND 1000),
  audio_path          TEXT,       -- object path inside the private "community-audio" storage bucket
  audio_duration_ms   INTEGER     CHECK (audio_duration_ms IS NULL OR audio_duration_ms BETWEEN 1 AND 120000),
  audio_mime          TEXT,
  audio_size_bytes    INTEGER     CHECK (audio_size_bytes IS NULL OR audio_size_bytes BETWEEN 1 AND 5000000),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((type = 'text'  AND text IS NOT NULL AND audio_path IS NULL) OR
         (type = 'audio' AND audio_path IS NOT NULL AND audio_duration_ms IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_community_messages_feed
  ON community_messages (community_id, created_at DESC);

ALTER TABLE communities          ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_messages   ENABLE ROW LEVEL SECURITY;
