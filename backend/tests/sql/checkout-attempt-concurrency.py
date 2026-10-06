"""Run only against the isolated fixture; never a configured project database."""
import concurrent.futures
import json
import subprocess
import time
import uuid
import argparse
parser = argparse.ArgumentParser()
parser.add_argument('--host', required=True)
parser.add_argument('--port', default='55439')
args = parser.parse_args()
command = ['psql', '-h', args.host, '-p', args.port, '-d', 'flikk_checkout_tests', '-v', 'ON_ERROR_STOP=1', '-At']
def query(sql):
    return subprocess.run(command, input=sql, text=True, capture_output=True)
def success(sql):
    result = query(sql)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout.strip()
assert success('select current_database()') == 'flikk_checkout_tests'
attempt = str(uuid.uuid4())
before = int(success('select count(*) from orders'))
stock = int(success("select stock_quantity from products where id='00000000-0000-4000-8000-000000000100'"))
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    first = pool.submit(query, f"begin; select test_attempt('{attempt}'); select pg_sleep(1.5); commit;")
    time.sleep(0.2)
    second = pool.submit(query, f"select test_attempt('{attempt}');")
    results = [first.result(), second.result()]
for result in results:
    assert result.returncode == 0, result.stderr
records = [json.loads(next(line for line in result.stdout.splitlines() if line.startswith('{'))) for result in results]
assert records[0]['result']['id'] == records[1]['result']['id']
assert sorted(record['replayed'] for record in records) == [False, True]
assert int(success('select count(*) from orders')) == before + 1
assert int(success("select stock_quantity from products where id='00000000-0000-4000-8000-000000000100'")) == stock - 1
closed = str(uuid.uuid4())
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    closing = pool.submit(query, f"begin; select close_checkout_attempt('00000000-0000-4000-8000-000000000003','{closed}','same','order'); select pg_sleep(1.5); commit;")
    time.sleep(0.2)
    creating = pool.submit(query, f"select test_attempt('{closed}');")
    assert closing.result().returncode == 0
    rejected = creating.result()
    assert rejected.returncode != 0 and 'Attempt closed' in rejected.stderr
assert int(success('select count(*) from orders')) == before + 1
print('Concurrent replay created exactly one order; closing fenced the competing creation; stock reserved once.')
