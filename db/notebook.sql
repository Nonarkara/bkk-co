-- Additive: existing anonymous ratings and local passports are untouched.
CREATE TABLE IF NOT EXISTS notebook_accounts (
 id TEXT PRIMARY KEY, key_hash TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
 research INTEGER NOT NULL DEFAULT 0, consent_version TEXT, consent_at TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notebook_sessions (
 token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES notebook_accounts(id) ON DELETE CASCADE, expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS notebook_session_owner ON notebook_sessions(account_id);
CREATE TABLE IF NOT EXISTS notebook_entries (
 id TEXT NOT NULL, account_id TEXT NOT NULL REFERENCES notebook_accounts(id) ON DELETE CASCADE, place_id TEXT NOT NULL,
 payload TEXT NOT NULL, revision INTEGER NOT NULL, updated_at TEXT NOT NULL,
 PRIMARY KEY(account_id,id)
);
CREATE TABLE IF NOT EXISTS notebook_posts (
 id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES notebook_accounts(id) ON DELETE CASCADE, entry_id TEXT NOT NULL,
 place_id TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL,
 hidden INTEGER NOT NULL DEFAULT 0, UNIQUE(account_id,entry_id),
 FOREIGN KEY(account_id,entry_id) REFERENCES notebook_entries(account_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS notebook_place_posts ON notebook_posts(place_id,created_at);
CREATE TABLE IF NOT EXISTS notebook_reports (
 post_id TEXT NOT NULL REFERENCES notebook_posts(id) ON DELETE CASCADE, account_id TEXT NOT NULL REFERENCES notebook_accounts(id) ON DELETE CASCADE, reason TEXT NOT NULL, created_at TEXT NOT NULL,
 PRIMARY KEY(post_id,account_id)
);
CREATE TABLE IF NOT EXISTS notebook_limits (
 scope TEXT NOT NULL, bucket INTEGER NOT NULL, n INTEGER NOT NULL,
 PRIMARY KEY(scope,bucket)
);
-- Hop logs: a walking route of places, published like a recommendation. No visit date is stored.
CREATE TABLE IF NOT EXISTS notebook_hops (
 id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES notebook_accounts(id) ON DELETE CASCADE,
 payload TEXT NOT NULL, created_at TEXT NOT NULL, hidden INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS notebook_hop_recent ON notebook_hops(created_at);
CREATE TABLE IF NOT EXISTS notebook_hop_reports (
 hop_id TEXT NOT NULL REFERENCES notebook_hops(id) ON DELETE CASCADE,
 account_id TEXT NOT NULL REFERENCES notebook_accounts(id) ON DELETE CASCADE,
 reason TEXT NOT NULL, created_at TEXT NOT NULL,
 PRIMARY KEY(hop_id,account_id)
);
