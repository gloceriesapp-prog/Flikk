"""Two independent review transactions must not lose store aggregate updates."""
import concurrent.futures
import json
import os
import subprocess


def sql(command):
    result = subprocess.run([os.getenv('PSQL_BIN', 'psql'), '-X', '-v', 'ON_ERROR_STOP=1', '-At', '-c', command], check=True, capture_output=True, text=True)
    return result.stdout.strip()


if sql('SELECT current_database()') != 'flikk_checkout_tests':
    raise SystemExit('Use disposable flikk_checkout_tests only')
store = '00000000-0000-4000-8000-000000000010'
customer = '00000000-0000-4000-8000-000000000003'
address = '00000000-0000-4000-8000-000000000002'
orders = json.loads(sql(f"""WITH inserted AS (
 INSERT INTO orders(customer_id,store_id,address_id,status,item_total,delivery_fee,commission_amount,total,payment_method)
 SELECT '{customer}','{store}','{address}','delivered',10,20,1,30,'cod' FROM generate_series(1,2)
 RETURNING id) SELECT json_agg(id) FROM inserted"""))
start = json.loads(sql(f"SELECT json_build_array(review_count,review_rating_sum) FROM stores WHERE id='{store}'"))
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    list(pool.map(lambda value: sql(f"BEGIN; SELECT submit_customer_review('{value[0]}','{customer}',{value[1]},null); SELECT pg_sleep(0.1); COMMIT;"), zip(orders, [2, 5])))
end = json.loads(sql(f"SELECT json_build_array(review_count,review_rating_sum) FROM stores WHERE id='{store}'"))
assert end == [start[0] + 2, start[1] + 7], (start, end)
assert sql(f"SELECT rating=round(review_rating_sum::numeric/review_count,1) FROM stores WHERE id='{store}'") == 't'
print('Concurrent reviews retained both ratings and the correct average.')
