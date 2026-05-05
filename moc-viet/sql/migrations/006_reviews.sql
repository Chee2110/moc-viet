-- Add reviews table for product ratings and comments
CREATE TABLE IF NOT EXISTS reviews (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  order_id   INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  rating     INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment    TEXT    DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user    ON reviews(user_id);

-- Add hotline and delivery info to shops
ALTER TABLE shops ADD COLUMN IF NOT EXISTS hotline      TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS delivery_days TEXT DEFAULT '2-4';
