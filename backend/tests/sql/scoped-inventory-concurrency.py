"""Prove that two transactions signalling one store don't share a hot row.
Run against a disposable database after migration 068, with PGHOST/PGPORT/
PGDATABASE/PGUSER set. Both transactions roll back their sample signals.
"""
import os
import subprocess
import time
import uuid

store = str(uuid.uuid4())
command = ['psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1']
environment = {**os.environ, 'PGCONNECT_TIMEOUT': '5'}
signal = f"SELECT public.signal_store_inventory('{store}'::uuid, ARRAY[]::uuid[], false);"
first = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                         stderr=subprocess.PIPE, text=True, env=environment)
first.stdin.write(f"BEGIN;\n{signal}\nSELECT 'TX_READY';\nSELECT pg_sleep(2);\nROLLBACK;\n")
first.stdin.close()
first.stdin = None
try:
    while True:
        line = first.stdout.readline()
        if line.strip() == 'TX_READY':
            break
        if not line:
            raise RuntimeError(first.stderr.read() or 'First transaction did not start')
    started = time.monotonic()
    second = subprocess.run(command + ['-c', f"BEGIN; SET LOCAL statement_timeout = '1s'; {signal} ROLLBACK;"],
                            capture_output=True, text=True, timeout=5, env=environment)
    elapsed = time.monotonic() - started
    if second.returncode:
        raise RuntimeError(second.stderr)
    if elapsed >= 1:
        raise AssertionError(f'Second transaction was blocked for {elapsed:.3f}s')
    _, error = first.communicate(timeout=5)
    if first.returncode:
        raise RuntimeError(error)
    print(f'PASS: concurrent same-store signal completed in {elapsed:.3f}s while first transaction held its signal for 2s')
finally:
    if first.poll() is None:
        first.kill()
        first.communicate()
