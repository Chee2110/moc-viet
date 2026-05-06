-- Add 'cancelled' and 'returned' to order status
DO $$
DECLARE cname TEXT;
BEGIN
  SELECT constraint_name INTO cname
  FROM information_schema.table_constraints
  WHERE table_name='orders' AND constraint_type='CHECK'
    AND constraint_name ILIKE '%status%';
  IF cname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE orders DROP CONSTRAINT ' || quote_ident(cname);
  END IF;
END$$;

ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK(status IN ('pending','approved','rejected','shipping','completed','cancelled','returned'));
