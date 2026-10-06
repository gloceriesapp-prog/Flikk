import { expect, it } from 'vitest';
import { Metrics } from './metrics.js';
it('renders cumulative histogram buckets and escapes labels', () => {
  const m=new Metrics();m.observe('flikk_latency_seconds',0.1,{route:'/orders/:id'});m.observe('flikk_latency_seconds',2,{route:'/orders/:id'});
  m.increment('flikk_requests_total',{route:'quote"\n'});
  const output=m.render();
  expect(output).toContain('flikk_latency_seconds_bucket{route="/orders/:id",le="0.1"} 1');
  expect(output).toContain('flikk_latency_seconds_bucket{route="/orders/:id",le="+Inf"} 2');
  expect(output).toContain('flikk_latency_seconds_sum{route="/orders/:id"} 2.1');
  expect(output).toContain('quote\\"\\n');
});
it('caps label-series memory and ignores non-finite numeric samples', () => {
  const m=new Metrics();for(let i=0;i<4200;i++)m.increment('flikk_requests_total',{route:String(i)});
  m.gauge('flikk_bad_value',NaN);
  const output=m.render();expect(output).toContain('flikk_metric_series_dropped_total 104');
  expect(output).not.toContain('NaN');expect(output).not.toContain('route="4199"');
});
