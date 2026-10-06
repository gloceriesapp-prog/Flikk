import { performance } from 'node:perf_hooks';
import { metrics } from './metrics.js';
let active = 0;
// Bound labels to operation/table names. Never record URL queries or bodies.
function operation(input: Parameters<typeof fetch>[0]) {
  try {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const rpc = parts.indexOf('rpc');
    const rest = parts.indexOf('v1');
    const value = rpc >= 0 ? `rpc:${parts[rpc+1]}` : url.pathname.startsWith('/rest/') ? `table:${parts[rest+1]}` : 'auth';
    return /^[a-z_:]{1,100}$/.test(value) ? value : 'other';
  } catch { return 'other'; }
}
export function measureDatabaseFetch(fetcher: typeof fetch): typeof fetch {
  return async (input, init) => {
    const started = performance.now(); const labels = { operation: operation(input) };
    active++; metrics.gauge('flikk_database_http_active', active);
    try {
      const response = await fetcher(input,init);
      metrics.increment('flikk_database_http_requests_total', {...labels, status: String(response.status)});
      if (!response.ok) metrics.increment('flikk_database_http_errors_total', labels);
      return response;
    } catch (error) { metrics.increment('flikk_database_http_errors_total', labels); throw error; }
    finally { active--; metrics.gauge('flikk_database_http_active',active); metrics.observe('flikk_database_http_duration_seconds',(performance.now()-started)/1000,labels); }
  };
}
