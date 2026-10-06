import http from 'k6/http';
import { check, fail } from 'k6';
import { Rate } from 'k6/metrics';
const base = (__ENV.BASE_URL || '').replace(/\/$/, '');
if (!/^https?:\/\//.test(base) || __ENV.TARGET_ENV !== 'staging') throw new Error('Set BASE_URL and TARGET_ENV=staging for a dedicated test deployment.');
const accounts = JSON.parse(open(__ENV.FIXTURE_FILE || './fixtures.local.json'));
if (!Array.isArray(accounts) || !accounts.length || accounts.some(a => !a.token || !a.storeId || !a.addressId || !a.orderId || !a.items?.length))
  throw new Error('Supply real staging customer tokens, owned orders/addresses and stocked cart items.');
const rate = Number(__ENV.RATE || 25);
const vus = Number(__ENV.MAX_VUS || 500);
if (!Number.isInteger(rate) || rate < 1 || !Number.isInteger(vus) || vus < 1) throw new Error('RATE and MAX_VUS must be positive integers.');
const semanticErrors = new Rate('workload_semantic_errors');
export const options = {
  scenarios: { mixed: { executor: 'ramping-arrival-rate', startRate: Math.max(1,Math.floor(rate/5)),timeUnit:'1s',
    preAllocatedVUs:Math.min(vus,Number(__ENV.PREALLOCATED_VUS||50)),maxVUs:vus,
    stages:[{duration:__ENV.RAMP||'2m',target:rate},{duration:__ENV.HOLD||'15m',target:rate},{duration:__ENV.COOLDOWN||'2m',target:Math.max(1,Math.floor(rate/5))}] } },
  thresholds: {
    http_req_failed:['rate<0.01'], workload_semantic_errors:['rate<0.01'],
    http_req_duration:['p(95)<750','p(99)<2000'], dropped_iterations:['count==0'],
    'http_req_duration{workload:quote}':['p(95)<1500'],
  },
  // Do not export arbitrary raw URLs/order IDs as metric labels.
  systemTags:['status','method','name','scenario','expected_response'],
};
function params(workload, account) {
  return {headers:account?{Authorization:`Bearer ${account.token}`,'Content-Type':'application/json'}:{},
    tags:{name:workload,workload},timeout:'10s'};
}
function verify(response, kind, account) {
  let valid=false;
  try {
    const data=response.json();
    valid=response.status===200 && (kind==='nearest'?Array.isArray(data)
      : kind==='tracking'?data.id===account.orderId
      : kind==='quote'?typeof data.token==='string' && Number.isFinite(data.bill?.total) && Array.isArray(data.items)
      : Array.isArray(data.items));
  } catch { /* Invalid JSON is a semantic failure. */ }
  semanticErrors.add(!valid);check(response,{'successful JSON response':()=>valid});
}
export function setup() {
  const a=accounts[0];
  const history=http.get(`${base}/orders/history?limit=20`,params('preflight-history',a));
  const quote=http.post(`${base}/checkout/quote`,JSON.stringify({address_id:a.addressId,items:a.items}),params('preflight-quote',a));
  if(history.status!==200 || quote.status!==200) fail('Staging fixture preflight failed. Verify ownership, tokens, stock and operating hours.');
}
export default function () {
  const a=accounts[(__VU-1)%accounts.length]; const pick=Math.random();
  if (pick<0.35) {
    // Mix cached metadata and uncached catalogue pages, not only /health.
    verify(http.get(`${base}/stores/${a.storeId}/products-page?limit=30`,params('catalogue')), 'catalogue');
  } else if(pick<0.55) {
    const cold=Math.random()<0.5;
    const lat=Number(a.lat)+(cold?(Math.random()-0.5)*0.04:0);
    const lng=Number(a.lng)+(cold?(Math.random()-0.5)*0.04:0);
    verify(http.get(`${base}/stores/nearest?lat=${lat}&lng=${lng}&limit=5`,params(cold?'nearest-cold':'nearest-hot')), 'nearest');
  } else if(pick<0.75) {
    const first=http.get(`${base}/orders/history?limit=20`,params('history',a)); verify(first,'history');
    if(Math.random()<0.2 && first.status===200) {
      const cursor=first.json('nextCursor');
      if(cursor) verify(http.get(`${base}/orders/history?limit=20&cursor=${encodeURIComponent(cursor)}`,params('history-next',a)), 'history');
    }
  } else if(pick<0.90) {
    verify(http.get(`${base}/orders/${a.orderId}/live`,params('tracking',a)), 'tracking',a);
  } else {
    // Quote only. Real money, orders, reservations and provider payouts are
    // excluded; write contention is exercised by the isolated SQL tests.
    verify(http.post(`${base}/checkout/quote`,JSON.stringify({address_id:a.addressId,items:a.items}),params('quote',a)), 'quote',a);
  }
}
export function handleSummary(data) {
  return {[__ENV.SUMMARY_FILE || 'capacity-summary.json']:JSON.stringify({
    tested_at:new Date().toISOString(),requested_rate:rate,fixture_accounts:accounts.length,
    metrics:data.metrics,thresholds_passed:Object.values(data.metrics).every(metric=>Object.values(metric.thresholds||{}).every(t=>t.ok)),
    scope:__ENV.VALIDATION_SCOPE || 'staging read/quote workload; excludes checkout writes, SSE, provider and mobile-network capacity',
  },null,2)};
}
