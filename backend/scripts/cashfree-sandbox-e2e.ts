// Cashfree SANDBOX end-to-end check of the provider adapter (no database, no
// live money). Refuses to run unless CASHFREE_ENV=sandbox with a TEST App ID.
// Usage: PUBLIC_API_URL=<tunnel> node --env-file=.env.local node_modules/.bin/tsx scripts/cashfree-sandbox-e2e.ts
import crypto from 'node:crypto';
import { env } from '../src/config/env.js';
import { CASHFREE_API_VERSION, cashfreeRefundId, createCfOrder, createCfRefund, getCfOrder, getCfOrderPayments, getCfRefunds, paiseFromRupees } from '../src/payments/cashfreeClient.js';
import { normalizeCashfreeRefund } from '../src/payments/refundPayment.js';
import { checkoutReceipt } from '../src/payments/razorpayClient.js';

if (env.cashfreeEnv !== 'sandbox' || !env.cashfreeAppId?.startsWith('TEST')) throw new Error('Sandbox only');
const base = 'https://sandbox.cashfree.com/pg';
const headers = () => ({ 'Content-Type': 'application/json', 'x-client-id': env.cashfreeAppId!, 'x-client-secret': env.cashfreeSecretKey!,
  'x-api-version': CASHFREE_API_VERSION, 'x-request-id': crypto.randomUUID() });
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function newOrder(rupees = 10) {
  const target = crypto.randomUUID();
  const orderId = checkoutReceipt(target);
  const order = await createCfOrder({ orderId, amountPaise: rupees * 100, customerId: target, phone: '9999999999',
    tags: { gloceries_order_id: target }, expiresAt: new Date(Date.now() + 30 * 60_000) });
  return { target, orderId, session: order.payment_session_id!, expected: rupees * 100 };
}
async function pay(session: string, method: unknown) {
  const res = await fetch(`${base}/orders/sessions`, { method: 'POST', headers: headers(), body: JSON.stringify({ payment_session_id: session, payment_method: method }) });
  const body = await res.json().catch(() => null) as { action?: string; data?: { url?: string }; cf_payment_id?: unknown; message?: string; code?: string } | null;
  return { http: res.status, action: body?.action, url: body?.data?.url, code: body?.code, message: body?.message };
}
// Same acceptance rule as reconcileCashfree: SUCCESS + exact paise + INR + order.
async function serverVerdict(orderId: string, expected: number, waitMs = 45_000) {
  const until = Date.now() + waitMs;
  for (;;) {
    const payments = await getCfOrderPayments(orderId);
    const ok = payments.filter(p => p.payment_status === 'SUCCESS' && p.order_id === orderId && p.payment_currency === 'INR' && paiseFromRupees(p.payment_amount) === expected);
    const statuses = payments.map(p => p.payment_status);
    if (ok.length || statuses.some(s => s === 'FAILED' || s === 'USER_DROPPED' || s === 'CANCELLED') || Date.now() > until)
      return { paid: ok.length > 0, statuses, paymentId: ok[0] ? String(ok[0].cf_payment_id) : undefined, group: payments[0]?.payment_group };
    await sleep(3000);
  }
}
const results: Record<string, unknown>[] = [];
const record = (name: string, pass: boolean, detail: Record<string, unknown>) => { results.push({ name, pass, ...detail }); console.log(JSON.stringify({ name, pass, ...detail })); };

const scenario = process.argv[2] ?? 'all';
if (scenario === 'all' || scenario === 'upi') {
  const a = await newOrder();
  const p = await pay(a.session, { upi: { channel: 'collect', upi_id: 'testsuccess@gocash' } });
  const v = await serverVerdict(a.orderId, a.expected);
  record('UPI success', v.paid, { orderId: a.orderId, pay: p, ...v });
  const b = await newOrder();
  const pb = await pay(b.session, { upi: { channel: 'collect', upi_id: 'testfailure@gocash' } });
  const vb = await serverVerdict(b.orderId, b.expected);
  record('UPI failure', !vb.paid && vb.statuses.includes('FAILED'), { orderId: b.orderId, pay: pb, ...vb });
  if (v.paid && v.paymentId) {
    const refundId = cashfreeRefundId(`gl_${crypto.randomUUID().replace(/-/g, '')}`);
    const created = normalizeCashfreeRefund(await createCfRefund(a.orderId, { refundId, amountPaise: a.expected, note: 'SUCCESS' }));
    let status = created.status;
    for (let i = 0; i < 10 && status === 'processing'; i++) { await sleep(3000);
      status = (await getCfRefunds(a.orderId)).map(normalizeCashfreeRefund).find(r => r.requestKey === refundId)?.status ?? status; }
    // Re-issuing the same refund_id must not create a second refund.
    let duplicate = 'rejected';
    try { await createCfRefund(a.orderId, { refundId, amountPaise: a.expected, note: 'SUCCESS' }); duplicate = 'accepted'; } catch (error) { duplicate = `rejected:${(error as { providerStatus?: number }).providerStatus}`; }
    const count = (await getCfRefunds(a.orderId)).filter(r => r.refund_id === refundId).length;
    record('Refund success', status === 'completed' && count === 1, { orderId: a.orderId, refundId, status, duplicateRetry: duplicate, refundsWithThisId: count });
  }
}
if (scenario === 'all' || scenario === 'cancel') {
  const c = await newOrder();
  const res = await fetch(`${base}/orders/${c.orderId}`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ order_status: 'TERMINATED' }) });
  const after = await getCfOrder(c.orderId);
  const v = await serverVerdict(c.orderId, c.expected, 0);
  record('Cancel (terminate unpaid order)', !v.paid && ['TERMINATED', 'TERMINATION_REQUESTED'].includes(after?.order_status ?? ''), { orderId: c.orderId, http: res.status, orderStatus: after?.order_status, ...v });
  // Same order_id twice: Cashfree must refuse, so a lost create can be recovered by GET.
  let dup = 'created';
  try { await createCfOrder({ orderId: c.orderId, amountPaise: c.expected, customerId: c.target, phone: '9999999999', tags: { gloceries_order_id: c.target } }); }
  catch (error) { dup = `refused:${(error as { providerStatus?: number }).providerStatus}`; }
  record('Duplicate create refused', dup === 'refused:409' || dup === 'refused:422', { orderId: c.orderId, duplicate: dup });
}
if (scenario === 'redirects') {
  // Card and netbanking need the sandbox OTP/bank page; print the link only.
  const n = await newOrder();
  console.log(JSON.stringify({ name: 'Netbanking (needs page)', orderId: n.orderId, pay: await pay(n.session, { netbanking: { channel: 'link', netbanking_bank_code: 3003 } }) }));
}
if (scenario.startsWith('check:')) {
  const orderId = scenario.slice(6);
  const order = await getCfOrder(orderId);
  console.log(JSON.stringify({ orderId, orderStatus: order?.order_status, ...(await serverVerdict(orderId, paiseFromRupees(order?.order_amount ?? 0), 0)) }));
}
console.log(JSON.stringify({ summary: results.map(r => `${r.name}: ${r.pass ? 'PASS' : 'FAIL'}`) }));
