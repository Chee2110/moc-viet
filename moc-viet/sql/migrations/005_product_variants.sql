-- Add variants JSONB column for per-variant pricing and stock
ALTER TABLE products ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;
