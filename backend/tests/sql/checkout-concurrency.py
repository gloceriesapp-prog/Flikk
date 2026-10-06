"""Run after checkout-eligibility.sql against the isolated local test DB."""
import argparse
import concurrent.futures
import json
import subprocess
import time

parser = argparse.ArgumentParser()
parser.add_argument('--host', required=True)
parser.add_argument('--port', default='55439')
args = parser.parse_args()
command = ['/opt/homebrew/opt/postgresql@14/bin/psql', '-X', '-h', args.host, '-p', args.port,
           '--dbname=flikk_checkout_tests', '-v', 'ON_ERROR_STOP=1', '-At']
def query(sql):
    return subprocess.run(command + ['-c', sql], text=True, capture_output=True)
assert query('select current_database()').stdout.strip() == 'flikk_checkout_tests'
assert query("update products set stock_quantity=1,stock_status='in_stock' where id='00000000-0000-4000-8000-000000000100'").returncode == 0
before = int(query('select count(*) from orders').stdout.strip())
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    first = pool.submit(query, 'begin; select (test_order(1)).id; select pg_sleep(1.5); commit;')
    time.sleep(0.2)
    second = pool.submit(query, 'select (test_order(1)).id;')
    results = [first.result(), second.result()]
assert sum(result.returncode == 0 for result in results) == 1, [r.stderr for r in results]
assert int(query('select count(*) from orders').stdout.strip()) == before + 1
assert query("select stock_quantity from products where id='00000000-0000-4000-8000-000000000100'").stdout.strip() == '0'
print(json.dumps({'last_unit_competing_checkouts': 'passed', 'successful_orders': 1, 'remaining_stock': 0}))
