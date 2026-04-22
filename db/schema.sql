CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  google_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  approved BOOLEAN DEFAULT TRUE,
  role     TEXT    DEFAULT 'user',
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
  bgg_rating            NUMERIC(4,2),
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

CREATE TABLE IF NOT EXISTS sessions (
  id               TEXT PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_name        TEXT NOT NULL,
  game_id          INTEGER REFERENCES games(id) ON DELETE SET NULL,
  played_at        DATE NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  mode             TEXT NOT NULL DEFAULT 'scores',
  outcome          TEXT,
  low_score_wins   BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session_players (
  id                   SERIAL PRIMARY KEY,
  session_id           TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id            TEXT NOT NULL,
  player_name          TEXT NOT NULL,
  score                INTEGER,
  winner               BOOLEAN DEFAULT FALSE,
  feedback_rating      INTEGER,
  feedback_play_again  TEXT,
  feedback_notes       TEXT
);

CREATE TABLE IF NOT EXISTS active_sessions (
  id        TEXT PRIMARY KEY,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data      JSONB NOT NULL,
  paused_at TIMESTAMPTZ
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS approved        BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role           TEXT    DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_enabled     BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_daily_limit INTEGER DEFAULT 20;
ALTER TABLE settings DROP COLUMN IF EXISTS show_why_btn;
ALTER TABLE games ADD COLUMN IF NOT EXISTS table_rating_override NUMERIC(3,1);
