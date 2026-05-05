-- Fix deals timestamps to use TIMESTAMPTZ so timezone comparisons with NOW() are correct
ALTER TABLE deals
  ALTER COLUMN start_time TYPE TIMESTAMPTZ USING start_time AT TIME ZONE 'UTC',
  ALTER COLUMN end_time   TYPE TIMESTAMPTZ USING end_time   AT TIME ZONE 'UTC';
