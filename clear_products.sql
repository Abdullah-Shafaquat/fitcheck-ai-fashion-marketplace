-- Clear all product data from the e-commerce database.
--
-- Tables:
--   "Product"  - the products table (id is SERIAL, sequence: Product_id_seq)
--   "Review"   - depends on Product via a CASCADE foreign key (Product.reviews)
--
-- TRUNCATE ... CASCADE removes every row from Product and the dependent
-- Review table, and drops + recreates the identity columns (RESTART IDENTITY),
-- which resets the Product_id_seq back to 1. This avoids FK constraint errors
-- and is much faster than DELETE for clearing all rows.

BEGIN;

TRUNCATE TABLE "Product", "Review" RESTART IDENTITY CASCADE;

-- Safety net: defensively reset any remaining sequence on these tables.
DO $$
DECLARE
  seq_name text;
BEGIN
  FOR seq_name IN
    SELECT pg_get_serial_sequence(c.table_schema || '.' || c.table_name, c.column_name)
    FROM information_schema.columns c
    WHERE lower(c.table_schema) = 'public'
      AND c.table_name IN ('Product', 'Review')
      AND pg_get_serial_sequence(c.table_schema || '.' || c.table_name, c.column_name) IS NOT NULL
  LOOP
    EXECUTE format('SELECT setval(%L, 1, false)', seq_name);
  END LOOP;
END $$;

COMMIT;
