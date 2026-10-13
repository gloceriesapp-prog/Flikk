"""Cross-connection claims and capture replays; disposable database only."""
import concurrent.futures
import json
import os
import pathlib
import subprocess

if os.environ.get("PGDATABASE") != "flikk_migrations_tests":
    raise RuntimeError("Use the isolated flikk_migrations_tests database")

psql = os.environ.get("PSQL_BIN", "psql")

def query(sql):
    result = subprocess.run([psql, "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-c", sql],
                            capture_output=True, text=True, check=True)
    return result.stdout.strip()

fixture = pathlib.Path(__file__).with_name("razorpay-payments.sql").read_text()
seed = fixture.split("SET LOCAL session_replication_role=replica;", 1)[1].split(
    "SET LOCAL session_replication_role=origin;", 1)[0]
query("BEGIN; SET LOCAL session_replication_role=replica;" + seed + "COMMIT;")
try:
    claim = "SELECT claim_checkout_payment('d0000000-0000-4000-8000-000000000001','order','d1000000-0000-4000-8000-000000000001','order')"
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        claims = list(executor.map(lambda _: json.loads(query(claim)), range(16)))
    assert sum(result["claimed"] for result in claims) == 1, "Provider creation was multiply claimed"
    query("SELECT attach_checkout_provider_order('order','d1000000-0000-4000-8000-000000000001','order_concurrent',7000)")
    capture = "SELECT settle_checkout_payment('d1000000-0000-4000-8000-000000000001',null,'pay_concurrent',7000,'INR','order_concurrent')"
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        captures = list(executor.map(lambda _: json.loads(query(capture)), range(16)))
    assert all(result["accepted"] for result in captures), "Capture replay lost acceptance"
    assert sum(result["settled_now"] for result in captures) == 1, "Capture settled more than once"
    print("16 concurrent provider claims and 16 capture replays passed")
finally:
    # This fixture creates only these namespaced rows; never truncate unrelated fixtures.
    query("""BEGIN; SET LOCAL session_replication_role=replica;
    DELETE FROM checkout_payment_sessions WHERE target_id::text LIKE 'd1000000-%';
    DELETE FROM orders WHERE id::text LIKE 'd1000000-%';
    DELETE FROM addresses WHERE id='d0000000-0000-4000-8000-000000000004';
    DELETE FROM stores WHERE id='d0000000-0000-4000-8000-000000000003';
    DELETE FROM users WHERE id IN('d0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000002');
    DELETE FROM zones WHERE id='d0000000-0000-4000-8000-000000000005'; COMMIT;""")
