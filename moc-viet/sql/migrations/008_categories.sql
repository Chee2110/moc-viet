-- Migration 008: Dynamic categories table
CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  value      VARCHAR(100) UNIQUE NOT NULL,
  label      VARCHAR(200) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default categories if table is empty
INSERT INTO categories (value, label, sort_order) VALUES
  ('go-tre',    'Gỗ & Tre',    1),
  ('gom-su',    'Gốm & Sứ',   2),
  ('trang-tri', 'Trang trí',   3),
  ('thu-cong',  'Thủ công',    4),
  ('khac',      'Khác',        5)
ON CONFLICT (value) DO NOTHING;
