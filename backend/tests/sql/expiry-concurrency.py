"""Competing expiry workers in a disposable clone of the isolated fixture."""
import argparse
import concurrent.futures
import json
import pathlib
import subprocess
import time
import uuid

parser = argparse.ArgumentParser()
parser.add_argument('--host', required=True)
parser.add_argument('--port', default='55439')
parser.add_argument('--user', default='nishalpoojary')
args = parser.parse_args()
base = ['psql', '-X', '-h', args.host, '-p', args.port, '-U', args.user, '-v', 'ON_ERROR_STOP=1', '-At']
def query(database, sql):
    return subprocess.run(base + ['-d', database], input=sql, text=True, capture_output=True)
def require(result):
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout.strip()
assert require(query('flikk_checkout_tests', 'select current_database();')) == 'flikk_checkout_tests'
name = 'flikk_expiry_test_' + uuid.uuid4().hex[:12]
require(query('postgres', f'CREATE DATABASE {name} TEMPLATE flikk_checkout_tests;'))
started = time.monotonic()
try:
    source = pathlib.Path('backend/tests/sql/expiry-capacity.sql').read_text()
    setup = source[:source.index('DO $$ DECLARE batch')].replace("current_database()<>'flikk_checkout_tests'", f"current_database()<>'{name}'")
    require(query(name, setup + '\nCOMMIT;'))
    # A failed process cannot leave a half-released transaction behind.
    require(query(name, 'BEGIN; SELECT expire_checkout_reservation_batch(100); ROLLBACK;'))
    assert require(query(name, "select stock_quantity from products where id='76000000-0000-0000-0000-000000000002';")) == '0'
    def drain():
        released = 0
        for _ in range(50):
            result = query(name, 'select expire_checkout_reservation_batch(100);')
            if result.returncode:
                # A contested stock lock must roll back the entire batch.
                if 'lock timeout' not in result.stderr and 'deadlock' not in result.stderr:
                    raise RuntimeError(result.stderr)
                time.sleep(0.05)
                continue
            released += json.loads(result.stdout)['cancelled_orders']
            remaining = require(query(name, "select count(*) from orders where store_id='76000000-0000-0000-0000-000000000001' and status='placed';"))
            if remaining == '0':
                return released
            time.sleep(0.02)
        raise RuntimeError('Expiry queue did not converge')
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        counts = list(pool.map(lambda _: drain(), range(2)))
    assert sum(counts) == 650, counts
    assert require(query(name, "select stock_quantity from products where id='76000000-0000-0000-0000-000000000002';")) == '650'
    assert require(query(name, "select count(*) from inventory_reservations where product_id='76000000-0000-0000-0000-000000000002' and state='held';")) == '0'
    print(json.dumps({'isolated_expiry_concurrency':'passed','workers':2,'cancelled_orders':sum(counts),'rollback_recovery':'passed','seconds':round(time.monotonic()-started,3),'scope':'local fixture, not production capacity'}))
finally:
    require(query('postgres', f'DROP DATABASE {name};'))
