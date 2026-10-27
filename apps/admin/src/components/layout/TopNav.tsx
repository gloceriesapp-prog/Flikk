'use client';

// Breadcrumb (Dashboard / current section) on the left; settings, the
// alerts bell, sign out and a contextual quick action on the right.
//
// The bell shows real counts of what needs a human (GET /api/attention:
// pending applications, products awaiting approval, refunds needing action,
// support requests waiting, orders stuck without a rider), each linking to
// the page that resolves it. The quick action only exists where a real flow
// is behind it (lib/nav.ts QUICK_ACTIONS).

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, ChevronRight, Download, LogOut, Plus, Save, Settings } from '@/components/icons';
import { ALL_NAV_ITEMS, NAV_GROUPS, QUICK_ACTIONS } from '@/lib/nav';
import { useAdminRealtime } from '@/lib/realtime/useAdminRealtime';

interface AttentionItem { key: string; label: string; count: number; href: string }

function AlertsBell() {
  const [items, setItems] = useState<AttentionItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/attention', { cache: 'no-store' });
      if (!res.ok) throw new Error();
      setItems(((await res.json()) as { items: AttentionItem[] }).items);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
    const id = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 30_000);
    return () => clearInterval(id);
  }, [load]);
  useAdminRealtime(load);

  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) { if (event.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const active = (items ?? []).filter((item) => item.count > 0);
  const total = active.reduce((sum, item) => sum + item.count, 0);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={total > 0 ? `Alerts: ${total} items need attention` : 'Alerts'}
        aria-expanded={open}
        onClick={() => { setOpen((v) => !v); if (!open) void load(); }}
        className="icon-btn relative"
      >
        <Bell size={16} />
        {total > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[9.5px] font-bold text-white ring-2 ring-white tabular-nums">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label="Alerts" className="card absolute right-0 top-11 z-50 w-80 animate-rise p-2 shadow-[var(--shadow-pop)]">
          <p className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Needs attention</p>
          {failed && !items ? (
            <p className="px-3 py-4 text-sm text-danger">Could not load alerts.</p>
          ) : !items ? (
            <p className="px-3 py-4 text-sm text-muted">Loading…</p>
          ) : active.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted">All caught up — nothing needs attention.</p>
          ) : (
            active.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-3 rounded-[10px] px-3 py-2.5 text-sm text-ink hover:bg-accent"
              >
                <span>{item.label}</span>
                <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-bold tabular-nums text-danger">{item.count}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function TopNav() {
  const pathname = usePathname();
  const current = ALL_NAV_ITEMS.find((item) => pathname.startsWith(item.href));
  const groupTitle = current ? NAV_GROUPS.find((g) => g.items.includes(current))?.title : undefined;
  const group = groupTitle && groupTitle !== current?.label ? groupTitle : undefined;
  const editingStore = /^\/stores\/[^/]+$/.test(pathname);
  const quickAction = current && current.href === pathname ? QUICK_ACTIONS[current.href] : undefined;
  const actionClass = 'btn btn-primary ml-2';

  return (
    <header className="flex h-[60px] shrink-0 items-center justify-between gap-4 border-b border-border bg-card/80 px-8 backdrop-blur">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
        <span className="text-muted">{group ?? 'Dashboard'}</span>
        {current && (
          <>
            <ChevronRight size={13} className="text-border-strong" />
            <span className="font-semibold text-ink">{current.label}</span>
          </>
        )}
      </nav>

      <div className="flex items-center gap-1.5">
        <Link
          href="/settings"
          aria-label="Settings"
          className="icon-btn"
        >
          <Settings size={16} />
        </Link>

        <AlertsBell />

        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            aria-label="Sign out"
            className="icon-btn"
          >
            <LogOut size={16} />
          </button>
        </form>

        {editingStore ? (
          <button type="submit" form="store-detail-form" className={actionClass}>
            <Save size={15} />
            Save store
          </button>
        ) : quickAction?.kind === 'save' ? (
          <button type="submit" form={quickAction.form} className={actionClass}>
            <Save size={15} />
            {quickAction.label}
          </button>
        ) : quickAction?.kind === 'download' && quickAction.href ? (
          <a href={quickAction.href} download className={actionClass}>
            <Download size={15} />
            {quickAction.label}
          </a>
        ) : quickAction?.href ? (
          <Link href={quickAction.href} className={actionClass}>
            <Plus size={15} />
            {quickAction.label}
          </Link>
        ) : null}
      </div>
    </header>
  );
}
