'use client';

// Customer notifications: the wording of every order-update push/inbox entry
// (customer_notification_templates, read by the order trigger) and sending a
// push to one customer or all customers through the push outbox. Both are
// audited (migration 117). Delivery status lives on the Push outbox page.

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

const inputClass = 'w-full rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10';

interface Template {
  event: string;
  label: string;
  title: string;
  body: string;
  defaultTitle: string;
  defaultBody: string;
  updatedAt: string;
  updatedBy: string | null;
}

interface SentMessage {
  id: string;
  audience: 'customer' | 'all_customers';
  customerId: string | null;
  customerLabel: string | null;
  title: string;
  body: string;
  recipients: number;
  adminEmail: string;
  createdAt: string;
}

function TemplateEditor({ template, onSaved }: { template: Template; onSaved: () => void }) {
  const [title, setTitle] = useState(template.title);
  const [body, setBody] = useState(template.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const dirty = title !== template.title || body !== template.body;

  async function save(next: { title: string; body: string }) {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/notification-templates/${template.event}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Could not save.');
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  const isDefault = template.title === template.defaultTitle && template.body === template.defaultBody;
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-[#F9FAFB] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{template.label}</p>
        {!isDefault && template.updatedBy && (
          <p className="text-xs text-muted">Edited by {template.updatedBy} · {new Date(template.updatedAt).toLocaleString('en-IN')}</p>
        )}
      </div>
      <input aria-label={`${template.label} title`} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
      <textarea aria-label={`${template.label} message`} value={body} maxLength={240} rows={2} onChange={(e) => setBody(e.target.value)} className={inputClass} />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy || !dirty || !title.trim() || !body.trim()} onClick={() => void save({ title, body })}
          className="rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
          {busy ? 'Saving…' : 'Save'}
        </button>
        {!isDefault && (
          <button type="button" disabled={busy} onClick={() => {
            setTitle(template.defaultTitle);
            setBody(template.defaultBody);
            void save({ title: template.defaultTitle, body: template.defaultBody });
          }} className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-ink hover:bg-accent disabled:opacity-40">
            Reset to default
          </button>
        )}
        {saved && !busy && <span role="status" className="text-xs text-green-700">Saved. Used from the next status change.</span>}
      </div>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

function SendPushCard({ initialCustomerId, onSent }: { initialCustomerId: string | null; onSent: () => void }) {
  const [audience, setAudience] = useState<'customer' | 'all'>('customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function send() {
    if (audience === 'all' && !window.confirm('Send this push to every customer? You can send one message to all customers per hour.')) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/push-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience, customerId: initialCustomerId, customerPhone, title, body }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? 'Could not send.');
      setResult(`Queued for ${data.recipients} customer${data.recipients === 1 ? '' : 's'}. Track delivery on the Push outbox page.`);
      setTitle('');
      setBody('');
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <h2 className="mb-1 text-sm font-semibold text-ink">Send a push</h2>
      <p className="mb-4 text-xs text-muted">
        Goes to the customer’s phone and their in-app notifications. Limits: one message to all customers per hour (three per day), 30 single-customer messages per hour.
      </p>
      <div className="flex flex-col gap-3">
        <div className="flex gap-4 text-sm text-ink">
          <label className="flex items-center gap-2">
            <input type="radio" checked={audience === 'customer'} onChange={() => setAudience('customer')} /> One customer
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={audience === 'all'} onChange={() => setAudience('all')} /> All customers
          </label>
        </div>
        {audience === 'customer' && (initialCustomerId ? (
          <p className="text-xs text-muted">To the customer you came from. <Link href="/notifications" className="font-semibold text-ink hover:underline">Pick someone else</Link></p>
        ) : (
          <input aria-label="Customer phone" value={customerPhone} placeholder="Customer phone, e.g. 98765 43210" onChange={(e) => setCustomerPhone(e.target.value)} className={inputClass} />
        ))}
        <input aria-label="Push title" value={title} maxLength={80} placeholder="Title (up to 80 characters)" onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        <textarea aria-label="Push message" value={body} maxLength={240} rows={3} placeholder="Message (up to 240 characters)" onChange={(e) => setBody(e.target.value)} className={inputClass} />
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => void send()} disabled={busy || !title.trim() || !body.trim()}
            className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white disabled:opacity-40">
            {busy ? 'Sending…' : 'Send push'}
          </button>
          {result && <span role="status" className="text-xs text-green-700">{result}</span>}
        </div>
        {error && <p className="text-xs font-medium text-danger">{error}</p>}
      </div>
    </div>
  );
}

export default function NotificationsPage({ searchParams }: { searchParams: Promise<{ customerId?: string }> }) {
  const { customerId } = use(searchParams);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [messages, setMessages] = useState<SentMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    try {
      const [tRes, mRes] = await Promise.all([fetch('/api/notification-templates'), fetch('/api/push-messages')]);
      const [tBody, mBody] = await Promise.all([tRes.json(), mRes.json()]);
      if (!tRes.ok) throw new Error(tBody.error ?? 'Could not load notification templates.');
      if (!mRes.ok) throw new Error(mBody.error ?? 'Could not load sent messages.');
      setTemplates(tBody);
      setMessages(mBody);
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load notifications.');
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Customer notifications</h1>
        <p className="text-sm text-muted">
          Order-update wording and messages to customers. Delivery status and failures are on the <Link href="/push-outbox" className="font-semibold text-ink hover:underline">Push outbox</Link>.
        </p>
      </div>
      {error && <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      <SendPushCard initialCustomerId={customerId && /^[0-9a-f-]{36}$/i.test(customerId) ? customerId : null} onSent={load} />

      <div className="rounded-3xl border border-border bg-card p-5">
        <h2 className="mb-1 text-sm font-semibold text-ink">Order update messages</h2>
        <p className="mb-4 text-xs text-muted">Sent automatically when an order changes status. Write {'{order_number}'} to include the order number.</p>
        <div className="flex flex-col gap-3">
          {templates.map((t) => <TemplateEditor key={`${t.event}-${version}`} template={t} onSaved={load} />)}
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">Recently sent</h2>
        {messages.length === 0 ? (
          <p className="text-sm text-muted">No messages sent yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((m) => (
              <li key={m.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                <p className="text-sm font-medium text-ink">{m.title}</p>
                <p className="text-xs text-muted">{m.body}</p>
                <p className="mt-1 text-xs text-muted">
                  {m.audience === 'all_customers' ? 'All customers' : m.customerLabel ?? 'One customer'} · {m.recipients} recipient{m.recipients === 1 ? '' : 's'} · {m.adminEmail} · {new Date(m.createdAt).toLocaleString('en-IN')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
