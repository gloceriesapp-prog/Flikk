"""Local fixture only: concurrent trip completion and refund job claims."""
import concurrent.futures
import json
import subprocess


def sql(command):
    result = subprocess.run(['psql', '-X', '-v', 'ON_ERROR_STOP=1', '-At', '-c', command], check=True, capture_output=True, text=True)
    return result.stdout.strip()


if sql('SELECT current_database()') != 'flikk_checkout_tests':
    raise SystemExit('Use disposable flikk_checkout_tests only')

trip = sql("""SELECT (create_trip_orders(
 '00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002',35,20,55,
 '[{"store_id":"00000000-0000-4000-8000-000000000010","item_total":10,"commission_amount":1,"items":[{"product_id":"00000000-0000-4000-8000-000000000100","quantity":1,"unit_price_at_order":10}]},
 {"store_id":"00000000-0000-4000-8000-000000000020","item_total":10,"commission_amount":1,"items":[{"product_id":"00000000-0000-4000-8000-000000000200","quantity":1,"unit_price_at_order":10}]}]'::jsonb,null,0,'cod',0)).id""")
# Every interpolated value below comes from this disposable database, not input.
sql(f"UPDATE orders SET rider_id='00000000-0000-4000-8000-000000000005',status='packed' WHERE trip_id='{trip}'")
sql(f"UPDATE orders SET status='out_for_delivery',picked_up_at=checkout_clock() WHERE trip_id='{trip}'")
orders = json.loads(sql(f"SELECT json_agg(id ORDER BY id) FROM orders WHERE trip_id='{trip}'"))
code = sql(f"SELECT code FROM delivery_codes WHERE scope_id='{trip}'")
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    outcomes = list(pool.map(lambda order: json.loads(sql(f"SELECT complete_verified_delivery('{order}','00000000-0000-4000-8000-000000000005','{code}')")), orders))
assert all(outcome['accepted'] for outcome in outcomes), outcomes
assert sql(f"SELECT count(*) FROM rider_earnings WHERE trip_id='{trip}' AND amount=35") == '1'
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    claims = list(pool.map(lambda _: json.loads(sql("SELECT coalesce(json_agg(id),'[]') FROM claim_order_refunds()")), range(2)))
assert not set(claims[0]).intersection(claims[1]), 'Refund job claimed twice'
assert claims[0] or claims[1], 'Fixture had no refund work'
print('Concurrent trip completion: one earning. Concurrent refund workers: disjoint claims.')
