"""Real two-session races; isolated test database only."""
import concurrent.futures
import json
import subprocess
import time
import argparse
parser=argparse.ArgumentParser()
parser.add_argument('--host',required=True)
parser.add_argument('--port',default='55439')
args=parser.parse_args()
command=['psql','-h',args.host,'-p',args.port,'-d','flikk_checkout_tests','-v','ON_ERROR_STOP=1','-At']
def query(sql): return subprocess.run(command,input=sql,text=True,capture_output=True)
def success(sql):
 r=query(sql)
 assert r.returncode==0,r.stderr
 return r.stdout.strip()
assert success('select current_database()')=='flikk_checkout_tests'
customer='00000000-0000-4000-8000-000000000003'
trip=success("select (test_cancel_trip('cod')).id")
leg=success(f"select id from orders where trip_id='{trip}' order by id limit 1")
success(f"update orders set status='packed' where id='{leg}'")
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 pickup=pool.submit(query,f"begin; update orders set status='out_for_delivery' where id='{leg}'; select pg_sleep(1); commit;")
 time.sleep(.2)
 cancellation=pool.submit(query,f"select cancel_customer_trip('{trip}','{customer}','Race pickup');")
 assert pickup.result().returncode==0
 result=cancellation.result()
 assert result.returncode==0,result.stderr
 assert json.loads(result.stdout.strip())['outcome']=='blocked'
assert success(f"select count(*) from orders where trip_id='{trip}' and status='cancelled'")=='0'
trip=success("select (test_cancel_trip('cod')).id")
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 first=pool.submit(query,f"begin; select cancel_customer_trip('{trip}','{customer}','First'); select pg_sleep(1); commit;")
 time.sleep(.2)
 second=pool.submit(query,f"select cancel_customer_trip('{trip}','{customer}','Retry');")
 assert first.result().returncode==0
 result=second.result()
 assert result.returncode==0,result.stderr
 assert json.loads(result.stdout.strip())['outcome']=='cancelled'
assert success(f"select count(*) from orders where trip_id='{trip}' and status='cancelled'")=='2'
# The cancellation wins before pickup: state trigger must reject resurrection.
trip=success("select (test_cancel_trip('cod')).id")
leg=success(f"select id from orders where trip_id='{trip}' order by id limit 1")
success(f"update orders set status='packed' where id='{leg}'")
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 first=pool.submit(query,f"begin; select cancel_customer_trip('{trip}','{customer}','Cancel first'); select pg_sleep(1); commit;")
 time.sleep(.2)
 pickup=pool.submit(query,f"update orders set status='out_for_delivery' where id='{leg}';")
 assert first.result().returncode==0
 result=pickup.result()
 assert result.returncode!=0,result.stdout
assert success(f"select count(*) from orders where trip_id='{trip}' and status='cancelled'")=='2'
print('Pickup/cancellation races serialize safely; competing cancellations are idempotent.')
