CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  google_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS players (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  emoji       TEXT,
  color       TEXT,
  last_played TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS session_expire_idx ON session (expire);

CREATE TABLE IF NOT EXISTS games (
  id                    SERIAL PRIMARY KEY,
  user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  type                  TEXT DEFAULT 'Board',
  complexity            TEXT DEFAULT 'Medium',
  min_players           INTEGER DEFAULT 1,
  max_players           INTEGER DEFAULT 4,
  play_time             INTEGER DEFAULT 60,
  age                   INTEGER DEFAULT 0,
  setup_time            INTEGER DEFAULT 10,
  rating                INTEGER,
  played                BOOLEAN DEFAULT FALSE,
  cooperative           BOOLEAN DEFAULT FALSE,
  thumbnail             TEXT,
  bgg_id                INTEGER,
  source                TEXT DEFAULT 'manual',
  spotify_embed_url     TEXT,
  spotify_playlist_name TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  user_id             INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  show_why_btn        BOOLEAN DEFAULT TRUE,
  bgg_username        TEXT,
  bgg_last_sync       TEXT,
  bgg_last_sync_count INTEGER
);
