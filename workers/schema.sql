CREATE TABLE IF NOT EXISTS leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_slug TEXT NOT NULL,
  score_type TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  player_name TEXT NOT NULL,
  score_value REAL NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(game_slug, score_type, ip_hash)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_game ON leaderboard(game_slug, score_type, score_value DESC);

CREATE TABLE IF NOT EXISTS global_stats (
  ip_hash TEXT PRIMARY KEY,
  player_name TEXT NOT NULL,
  total_played INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_time INTEGER DEFAULT 0,
  favorite_game TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_global_played ON global_stats(total_played DESC);
