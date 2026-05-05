-- V2 features: google auth, avatar, notification type
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
