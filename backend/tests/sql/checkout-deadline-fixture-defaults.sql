-- Historic security fixtures seed orders with all triggers disabled. Defaults
-- below exist only in the disposable test database; live writes always use
-- snapshot_checkout_deadlines and do not receive these fixture defaults.
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Disposable fixture only'; END IF; END $$;
ALTER TABLE orders ALTER COLUMN reservation_expires_at SET DEFAULT (now()+interval '20 minutes'), ALTER COLUMN reservation_release_after SET DEFAULT (now()+interval '50 minutes');
ALTER TABLE trips ALTER COLUMN reservation_expires_at SET DEFAULT (now()+interval '20 minutes'), ALTER COLUMN reservation_release_after SET DEFAULT (now()+interval '50 minutes');
