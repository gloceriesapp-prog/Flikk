-- GLO-XXXX-XXXX order numbers (migration 20261101160000_glo_order_numbers.sql).
DO $$
DECLARE
  n_distinct bigint;
  generated text;
BEGIN
  -- Format.
  IF public.order_number_for(1) !~ '^GLO-[0-9]{4}-[0-9]{4}$' THEN
    RAISE EXCEPTION 'bad format: %', public.order_number_for(1);
  END IF;

  -- Guaranteed unique: a million consecutive sequence values, a million
  -- distinct numbers (the permutation never repeats inside 10^8).
  SELECT count(DISTINCT public.order_number_for(n)) INTO n_distinct FROM generate_series(1, 1000000) n;
  IF n_distinct <> 1000000 THEN RAISE EXCEPTION 'collision: % distinct of 1000000', n_distinct; END IF;

  -- Not sequential-looking: neighbours differ in more than the last digit.
  IF left(public.order_number_for(100), 8) = left(public.order_number_for(101), 8) THEN
    RAISE EXCEPTION 'consecutive numbers look sequential';
  END IF;

  -- The column default generates it.
  SELECT column_default INTO generated FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'order_number';
  IF generated NOT LIKE '%order_number_for%' THEN RAISE EXCEPTION 'default not wired: %', generated; END IF;
END $$;

-- The old format is refused by a CHECK on the column.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_order_number_format'
      AND pg_get_constraintdef(oid) LIKE '%GLO-%'
  ) THEN
    RAISE EXCEPTION 'format constraint missing';
  END IF;
END $$;
