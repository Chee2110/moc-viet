-- Migration: Add variant_name to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS variant_name TEXT;
