-- BonCi: quản lý kho hàng & hóa đơn (tích hợp vào Mộc Việt)
-- Tất cả bảng đều có tiền tố inv_ để tránh xung đột với bảng Mộc Việt

CREATE TABLE IF NOT EXISTS inv_companies (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL DEFAULT 'Nam Khánh',
  tax_code    TEXT,
  address     TEXT,
  phone       TEXT,
  email       TEXT,
  representative       TEXT,
  representative_title TEXT,
  bank_account  TEXT,
  bank_name     TEXT,
  bank_account_2 TEXT,
  bank_name_2   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inv_products (
  id           BIGSERIAL PRIMARY KEY,
  company_id   BIGINT NOT NULL REFERENCES inv_companies(id),
  product_code TEXT NOT NULL,
  name         TEXT NOT NULL,
  unit         TEXT DEFAULT 'cái',
  cost_price   NUMERIC DEFAULT 0,
  sell_price   NUMERIC DEFAULT 0,
  description  TEXT DEFAULT '',
  category     TEXT DEFAULT '',
  distributor  TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, product_code)
);

CREATE TABLE IF NOT EXISTS inv_inventory (
  id         BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL UNIQUE REFERENCES inv_products(id),
  company_id BIGINT NOT NULL REFERENCES inv_companies(id),
  quantity   NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inv_inventory_logs (
  id         BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES inv_products(id),
  company_id BIGINT NOT NULL REFERENCES inv_companies(id),
  type       TEXT NOT NULL CHECK(type IN ('init','import','export')),
  quantity   NUMERIC NOT NULL,
  price      NUMERIC DEFAULT 0,
  date       DATE NOT NULL,
  note       TEXT DEFAULT '',
  supplier   TEXT DEFAULT '',
  invoice_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inv_customers (
  id            BIGSERIAL PRIMARY KEY,
  company_id    BIGINT NOT NULL REFERENCES inv_companies(id),
  customer_code TEXT NOT NULL,
  name          TEXT NOT NULL,
  phone         TEXT DEFAULT '',
  email         TEXT DEFAULT '',
  address       TEXT DEFAULT '',
  note          TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, customer_code)
);

CREATE TABLE IF NOT EXISTS inv_invoices (
  id                    BIGSERIAL PRIMARY KEY,
  company_id            BIGINT NOT NULL REFERENCES inv_companies(id),
  invoice_number        TEXT NOT NULL,
  customer_id           BIGINT,
  customer_name         TEXT NOT NULL,
  customer_address      TEXT DEFAULT '',
  customer_representative TEXT DEFAULT '',
  customer_title        TEXT DEFAULT '',
  date                  DATE NOT NULL,
  vat_rate              NUMERIC DEFAULT 8,
  subtotal              NUMERIC DEFAULT 0,
  vat_amount            NUMERIC DEFAULT 0,
  total_amount          NUMERIC DEFAULT 0,
  status                TEXT DEFAULT 'unpaid' CHECK(status IN ('paid','unpaid')),
  note                  TEXT DEFAULT '',
  is_return             INTEGER DEFAULT 0,
  original_invoice_id   BIGINT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS inv_invoice_items (
  id           BIGSERIAL PRIMARY KEY,
  invoice_id   BIGINT NOT NULL REFERENCES inv_invoices(id) ON DELETE CASCADE,
  product_id   BIGINT,
  product_code TEXT,
  product_name TEXT NOT NULL,
  unit         TEXT DEFAULT '',
  quantity     NUMERIC NOT NULL,
  unit_price   NUMERIC NOT NULL,
  cost_price   NUMERIC DEFAULT 0,
  total_price  NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS inv_categories (
  id         BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES inv_companies(id),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- Seed công ty mặc định nếu bảng còn trống
INSERT INTO inv_companies (name, address, phone)
SELECT 'CÔNG TY TNHH NK NAM KHÁNH', 'Hà Nội, Việt Nam', ''
WHERE NOT EXISTS (SELECT 1 FROM inv_companies);
