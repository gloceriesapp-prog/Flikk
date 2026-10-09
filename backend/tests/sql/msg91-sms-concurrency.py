"""Concurrency regression against the disposable PostgreSQL fixture only."""
import concurrent.futures
import os
import subprocess

if os.environ.get("PGDATABASE") != "flikk_migrations_tests":
    raise RuntimeError("Disposable fixture only")

def sql(statement):
    guard = "DO $$ BEGIN IF current_database() <> 'flikk_migrations_tests' THEN RAISE EXCEPTION 'Disposable fixture only'; END IF; END $$;"
    return subprocess.check_output([os.environ.get("PSQL_BIN", "psql"), "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", guard + statement], text=True).strip().splitlines()[-1]

clear = "TRUNCATE public.auth_sms_deliveries, public.auth_sms_budgets;"
try:
    sql(clear)
    claim = "SELECT public.claim_send_sms_delivery(repeat('c',64),repeat('d',64),repeat('e',64),100,10000);"
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda _: sql(claim), range(8)))
    assert results.count("claimed") == 1 and results.count("blocked") == 7, results
    sql("SELECT public.finish_send_sms_delivery(repeat('c',64),'sent');")
    assert sql(claim) == "sent"
    sql(clear)
    def competing(index):
        return sql(f"SELECT public.claim_send_sms_delivery(md5('event{index}')||md5('id{index}'),repeat('d',64),repeat('e',64),100,10000);")
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(competing, range(8)))
    assert results.count("claimed") == 1 and results.count("blocked") == 7, results
    print("Concurrent SMS claims and phone quota verified")
finally:
    sql(clear)
