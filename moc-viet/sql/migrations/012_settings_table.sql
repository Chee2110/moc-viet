CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

INSERT INTO settings(key, value)
VALUES ('banner_url', 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=2000')
ON CONFLICT (key) DO NOTHING;
