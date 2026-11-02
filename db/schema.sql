CREATE TABLE IF NOT EXISTS ratings (
  id INTEGER PRIMARY KEY,
  place_id TEXT NOT NULL,
  wifi INTEGER NOT NULL CHECK (wifi BETWEEN 1 AND 3),
  power INTEGER NOT NULL CHECK (power BETWEEN 1 AND 3),
  quiet INTEGER NOT NULL CHECK (quiet BETWEEN 1 AND 3),
  laptop INTEGER NOT NULL CHECK (laptop BETWEEN 1 AND 3),
  ip_hash TEXT NOT NULL,   -- salted SHA-256, raw IP never stored (PDPA)
  day TEXT NOT NULL,       -- YYYY-MM-DD, Asia/Bangkok
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS one_per_place_per_day ON ratings (place_id, ip_hash, day);
CREATE INDEX IF NOT EXISTS by_ip_day ON ratings (ip_hash, day);
