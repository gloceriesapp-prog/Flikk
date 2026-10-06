import type { RequestHandler } from 'express';
import { performance } from 'node:perf_hooks';
import { metrics } from './metrics.js';
let active = 0;
export const measureHttp: RequestHandler = (req, res, next) => {
  const started = performance.now();
  active++; metrics.gauge('flikk_http_active_requests', active);
  let ended = false;
  const finish = () => {
    if (ended) return; ended = true;
    active--; metrics.gauge('flikk_http_active_requests', active);
    // Route templates only: no order IDs, addresses, query strings or tokens.
    const route = typeof req.route?.path === 'string' ? `${req.baseUrl}${req.route.path}` : 'unmatched';
    const method = ['GET','POST','PUT','PATCH','DELETE','OPTIONS'].includes(req.method) ? req.method : 'OTHER';
    const labels = { route: route.length <= 140 ? route : 'other', method,
      status: res.writableFinished ? `${Math.floor(res.statusCode/100)}xx` : 'aborted' };
    metrics.increment('flikk_http_requests_total', labels);
    if (!res.writableFinished || res.statusCode >= 500) metrics.increment('flikk_http_errors_total', labels);
    if (res.getHeader('Content-Type')?.toString().startsWith('text/event-stream'))
      metrics.observe('flikk_sse_connection_seconds', (performance.now()-started)/1000);
    else metrics.observe('flikk_http_request_duration_seconds', (performance.now()-started)/1000, labels);
  };
  res.once('finish', finish); res.once('close', finish);
  next();
};
