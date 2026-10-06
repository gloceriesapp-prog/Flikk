import { expect, it, vi } from 'vitest';
import { measureDatabaseFetch } from './database.js';
import { metrics } from './metrics.js';
it('records bounded operation labels without leaking query filters or tokens',async()=>{
  const fetcher=vi.fn().mockResolvedValue({ok:true,status:200});
  await measureDatabaseFetch(fetcher)('https://example.com/rest/v1/orders?customer_id=eq.secret-customer',{headers:{Authorization:'secret-token'}});
  const output=metrics.render();expect(output).toContain('operation="table:orders"');
  expect(output).not.toContain('secret-customer');expect(output).not.toContain('secret-token');
});
it('counts thrown database failures and releases the active gauge',async()=>{
  const fetcher=vi.fn().mockRejectedValue(new Error('Connection failed'));
  await expect(measureDatabaseFetch(fetcher)('https://example.com/rest/v1/rpc/capacity_snapshot')).rejects.toThrow('Connection failed');
  const output=metrics.render();expect(output).toContain('flikk_database_http_active 0');
  expect(output).toContain('flikk_database_http_errors_total{operation="rpc:capacity_snapshot"} 1');
});
