'use client';

// Promotions — compose an SMS or email campaign for explicitly chosen
// customers (up to 100), see past campaigns and each recipient's delivery
// status, and flip the promotions kill switch. Queued messages are sent by
// the backend worker only while this switch AND the backend's
// PROMOTIONS_ENABLED setting are on; the worker skips anyone who opted out
// or has no confirmed phone/email. Retrying a failed queue request reuses
// the same campaign ID, so nobody gets the message twice.

import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';

type Channel = 'sms' | 'email';
interface Counts { recipients: number; queued: number; sending: number; accepted: number; skipped: number; failed: number; uncertain: number }
interface Campaign { campaignId: string; channel: Channel; subject: string; body: string; createdAt: string; updatedAt: string; counts: Counts }
interface Delivery { id: string; customerId: string; customerName: string | null; channel: string; status: string; attempts: number; updatedAt: string }
interface Customer { id: string; name: string | null; phone: string }

const MAX_RECIPIENTS = 100;
const SUBJECT_MAX = 120;
const BODY_MAX = 2000;
const STATUS_HELP: Record<string, string> = {
  queued: 'Waiting to send', sending: 'Sending now', accepted: 'Accepted by the provider (not proof of delivery)',
  skipped: 'Not sent: opted out, unconfirmed contact or expired', failed: 'Provider refused', uncertain: 'Check the provider before resending',
};
const inputClass = 'w-full rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10';

function newCampaignId() {
  return crypto.randomUUID();
}

export default function PromotionsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [openCampaign, setOpenCampaign] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[] | null>(null);

  // Composer. campaignId stays the same until the queue succeeds, so a
  // retried submit is idempotent.
  const [campaignId, setCampaignId] = useState(newCampaignId);
  const [channel, setChannel] = useState<Channel>('sms');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [recipients, setRecipients] = useState<Customer[]>([]);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/promotions');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not load promotions.');
      setEnabled(data.promotionsEnabled === true);
      setCampaigns(data.campaigns ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load promotions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { Promise.resolve().then(load); }, [load]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const timer = setTimeout(() => {
      fetch(`/api/customers?q=${encodeURIComponent(q)}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((rows: Customer[]) => setResults(Array.isArray(rows) ? rows : []))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  async function toggleSwitch() {
    setSwitching(true);
    setError(null);
    try {
      const res = await fetch('/api/promotions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ promotionsEnabled: !enabled }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not change the switch.');
      setEnabled(data.promotionsEnabled === true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the switch.');
    } finally {
      setSwitching(false);
    }
  }

  async function showDeliveries(id: string) {
    if (openCampaign === id) { setOpenCampaign(null); return; }
    setOpenCampaign(id);
    setDeliveries(null);
    const res = await fetch(`/api/promotions/${id}`);
    setDeliveries(res.ok ? await res.json() : []);
  }

  function addRecipient(customer: Customer) {
    setRecipients((prev) => (prev.some((c) => c.id === customer.id) || prev.length >= MAX_RECIPIENTS ? prev : [...prev, customer]));
  }

  const canSend = enabled && !sending && recipients.length > 0 && subject.trim().length > 0 && body.trim().length > 0
    && subject.length <= SUBJECT_MAX && body.length <= BODY_MAX;

  async function queueCampaign() {
    if (!canSend) return;
    if (!window.confirm(`Queue this ${channel.toUpperCase()} for ${recipients.length} customer${recipients.length === 1 ? '' : 's'}?`)) return;
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/promotions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId, customer_ids: recipients.map((c) => c.id), channel, subject, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not queue the campaign.');
      setNotice(`Queued for ${data.recipients} customer${data.recipients === 1 ? '' : 's'}.`);
      setCampaignId(newCampaignId());
      setSubject(''); setBody(''); setRecipients([]); setQuery(''); setResults([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not queue the campaign.');
    } finally {
      setSending(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Promotions</h1>
        <p className="text-sm text-muted">Send an SMS or email offer to chosen customers. Customers who opted out are skipped automatically.</p>
      </div>

      {error && <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
      {notice && <p role="status" className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</p>}

      <div className="flex items-center justify-between gap-4 rounded-3xl border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-semibold text-ink">Promotions are {enabled ? 'on' : 'off'}</h2>
          <p className="text-xs text-muted">
            Off stops all sending within a minute; queued messages wait (and expire after 24 hours). Sending also needs the
            backend&apos;s PROMOTIONS_ENABLED setting and SMS/email provider keys.
          </p>
        </div>
        <button type="button" onClick={toggleSwitch} disabled={switching}
          className={clsx('shrink-0 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-40', enabled ? 'bg-danger/10 text-danger' : 'bg-ink text-white')}>
          {switching ? 'Saving…' : enabled ? 'Turn off' : 'Turn on'}
        </button>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">New campaign</h2>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            {(['sms', 'email'] as const).map((c) => (
              <button key={c} type="button" onClick={() => setChannel(c)}
                className={clsx('rounded-full px-4 py-1.5 text-sm font-medium', channel === c ? 'bg-ink text-white' : 'bg-accent text-ink')}>
                {c === 'sms' ? 'SMS' : 'Email'}
              </button>
            ))}
          </div>
          <div>
            <label htmlFor="promo-subject" className="mb-1.5 block text-xs font-medium text-muted">
              {channel === 'email' ? 'Email subject' : 'Campaign name (not sent by SMS)'} · {subject.length}/{SUBJECT_MAX}
            </label>
            <input id="promo-subject" value={subject} maxLength={SUBJECT_MAX} onChange={(e) => setSubject(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="promo-body" className="mb-1.5 block text-xs font-medium text-muted">Message · {body.length}/{BODY_MAX}</label>
            <textarea id="promo-body" value={body} maxLength={BODY_MAX} rows={4} onChange={(e) => setBody(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="promo-search" className="mb-1.5 block text-xs font-medium text-muted">
              Recipients · {recipients.length}/{MAX_RECIPIENTS}
            </label>
            <input id="promo-search" value={query} onChange={(e) => { setQuery(e.target.value); if (e.target.value.trim().length < 2) setResults([]); }}
              placeholder="Search customers by name or phone" className={inputClass} />
            {results.length > 0 && (
              <ul className="mt-2 max-h-48 overflow-auto rounded-xl border border-border">
                {results.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => addRecipient(c)} disabled={recipients.some((r) => r.id === c.id)}
                      className="flex w-full justify-between px-3.5 py-2 text-left text-sm text-ink hover:bg-accent disabled:opacity-40">
                      <span>{c.name || 'Unnamed customer'}</span><span className="text-muted">{c.phone}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {recipients.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {recipients.map((c) => (
                  <button key={c.id} type="button" onClick={() => setRecipients((prev) => prev.filter((r) => r.id !== c.id))}
                    className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-ink" aria-label={`Remove ${c.name || c.phone}`}>
                    {c.name || c.phone} ×
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={queueCampaign} disabled={!canSend}
              className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40">
              {sending ? 'Queuing…' : 'Queue campaign'}
            </button>
            {!enabled && <span className="text-xs text-muted">Turn promotions on to queue a campaign.</span>}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">Past campaigns</h2>
        {campaigns.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No campaigns yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {campaigns.map((c) => (
              <div key={`${c.campaignId}-${c.channel}`} className="rounded-2xl bg-[#F9FAFB] px-4 py-3">
                <button type="button" onClick={() => showDeliveries(c.campaignId)} className="flex w-full items-start justify-between gap-4 text-left">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{c.subject}</p>
                    <p className="truncate text-xs text-muted">{c.channel.toUpperCase()} · {new Date(c.createdAt).toLocaleString()} · {c.body}</p>
                  </div>
                  <p className="shrink-0 text-xs text-muted">
                    {c.counts.recipients} recipients · {c.counts.accepted} accepted · {c.counts.queued + c.counts.sending} pending
                    {c.counts.skipped ? ` · ${c.counts.skipped} skipped` : ''}{c.counts.failed ? ` · ${c.counts.failed} failed` : ''}
                    {c.counts.uncertain ? ` · ${c.counts.uncertain} uncertain` : ''}
                  </p>
                </button>
                {openCampaign === c.campaignId && (
                  <div className="mt-3 border-t border-border pt-3">
                    {deliveries === null ? <p className="text-xs text-muted">Loading…</p> : (
                      <table className="w-full text-left text-xs">
                        <thead className="text-muted"><tr><th className="py-1">Customer</th><th>Channel</th><th>Status</th><th>Attempts</th><th>Updated</th></tr></thead>
                        <tbody>
                          {deliveries.map((d) => (
                            <tr key={d.id} className="border-t border-border">
                              <td className="py-1.5 text-ink">{d.customerName || d.customerId.slice(0, 8)}</td>
                              <td>{d.channel.toUpperCase()}</td>
                              <td title={STATUS_HELP[d.status]} className="font-medium text-ink">{d.status}</td>
                              <td>{d.attempts}</td>
                              <td>{new Date(d.updatedAt).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
