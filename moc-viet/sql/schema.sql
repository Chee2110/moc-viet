-- ══════════════════════════════════════════════════
--  MỘC VIỆT — Schema PostgreSQL v2
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  email      TEXT    UNIQUE NOT NULL,
  password   TEXT    NOT NULL,
  role       TEXT    NOT NULL CONSTRAINT users_role_check CHECK(role IN ('admin', 'seller', 'buyer')),
  full_name  TEXT,
  phone      TEXT,
  is_active  BOOLEAN   DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shops (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  name        TEXT    NOT NULL,
  description TEXT    DEFAULT '',
  status      TEXT    DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id             SERIAL PRIMARY KEY,
  shop_id        INTEGER       NOT NULL REFERENCES shops(id),
  name           TEXT          NOT NULL,
  price          NUMERIC(15,0) NOT NULL,
  description    TEXT          DEFAULT '',
  image_url      TEXT,
  category       TEXT          DEFAULT 'khac',
  stock_quantity INTEGER       DEFAULT 100,
  is_hidden      BOOLEAN       DEFAULT FALSE,
  is_deleted     BOOLEAN       DEFAULT FALSE,
  created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER       REFERENCES users(id),
  product_id  INTEGER       NOT NULL REFERENCES products(id),
  shop_id     INTEGER       NOT NULL REFERENCES shops(id),
  full_name   TEXT          NOT NULL,
  phone       TEXT          NOT NULL,
  address     TEXT          NOT NULL,
  quantity    INTEGER       NOT NULL DEFAULT 1,
  unit_price  NUMERIC(15,0) NOT NULL,
  total_price NUMERIC(15,0) NOT NULL,
  status      TEXT          DEFAULT 'pending'
              CHECK(status IN ('pending', 'approved', 'rejected', 'shipping', 'completed')),
  note        TEXT          DEFAULT '',
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deals (
  id               SERIAL PRIMARY KEY,
  product_id       INTEGER       NOT NULL REFERENCES products(id),
  discount_percent INTEGER       NOT NULL CHECK(discount_percent BETWEEN 1 AND 99),
  start_time       TIMESTAMP     NOT NULL,
  end_time         TIMESTAMP     NOT NULL,
  discounted_price NUMERIC(15,0) NOT NULL,
  created_by       INTEGER       NOT NULL REFERENCES users(id),
  created_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER   NOT NULL REFERENCES users(id),
  order_id   INTEGER   REFERENCES orders(id),
  message    TEXT      NOT NULL,
  is_read    BOOLEAN   DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cart_items (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity   INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS favorites (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);
