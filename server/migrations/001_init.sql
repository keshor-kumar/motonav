-- MotoNav Stage 3 schema. Idempotent: safe to re-run.
-- Privacy: ride_members keeps ONLY each rider's latest position (no history table),
-- and coordinates are nulled when a rider leaves or the ride ends.

CREATE TABLE IF NOT EXISTS riders (
  id          UUID PRIMARY KEY,
  name        TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rides (
  id                    UUID PRIMARY KEY,
  ride_code             TEXT        NOT NULL UNIQUE CHECK (ride_code ~ '^[A-Z0-9]{6}$'),
  ride_name             TEXT        NOT NULL CHECK (char_length(ride_name) BETWEEN 1 AND 80),
  destination           TEXT        NOT NULL CHECK (char_length(destination) BETWEEN 1 AND 200),
  destination_latitude  DOUBLE PRECISION NOT NULL CHECK (destination_latitude BETWEEN -90 AND 90),
  destination_longitude DOUBLE PRECISION NOT NULL CHECK (destination_longitude BETWEEN -180 AND 180),
  created_by            UUID        NOT NULL REFERENCES riders(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  status                TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  ended_at              TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ride_members (
  ride_id            UUID        NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  user_id            UUID        NOT NULL REFERENCES riders(id),
  name               TEXT        NOT NULL,
  latitude           DOUBLE PRECISION CHECK (latitude BETWEEN -90 AND 90),
  longitude          DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),
  heading            DOUBLE PRECISION CHECK (heading >= 0 AND heading < 360),
  speed              DOUBLE PRECISION CHECK (speed >= 0),
  last_updated       TIMESTAMPTZ NOT NULL DEFAULT now(),
  connection_status  TEXT        NOT NULL DEFAULT 'disconnected'
                     CHECK (connection_status IN ('connected', 'disconnected', 'left')),
  joined_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ride_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ride_members_ride ON ride_members (ride_id);
CREATE INDEX IF NOT EXISTS idx_rides_code ON rides (ride_code);
