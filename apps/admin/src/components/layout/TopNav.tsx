'use client';

// Matches the reference exactly: breadcrumb (Dashboard / current section)
// on the left, team avatar stack + settings + notifications + a
// contextual CTA on the right. Client component now — usePathname drives
// both the breadcrumb label and which quick-action the CTA shows, since
// unlike the reference's one static "+ Create Task", every section here
// has a different primary create action.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, LogOut, Plus, Save, Settings } from 'lucide-react';
import { ALL_NAV_ITEMS, QUICK_ACTION_LABEL } from '@/lib/nav';

const TEAM_AVATAR_COLORS = ['bg-rose-200', 'bg-amber-200', 'bg-sky-200'];

export function TopNav() {
  const pathname = usePathname();
  const current = ALL_NAV_ITEMS.find((item) => pathname.startsWith(item.href));
  const editingStore = /^\/stores\/[^/]+$/.test(pathname);
  const quickActionLabel = current ? QUICK_ACTION_LABEL[current.href] : undefined;

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-canvas px-8 py-4">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
        <span className="text-muted">Dashboard</span>
        {current && (
          <>
            <span className="text-muted">/</span>
            <span className="font-semibold text-ink">{current.label}</span>
          </>
        )}
      </nav>

      <div className="flex items-center gap-3">
        <div className="flex items-center -space-x-2">
          {TEAM_AVATAR_COLORS.map((color, i) => (
            <div key={i} className={`h-8 w-8 rounded-full border-2 border-canvas ${color}`} />
          ))}
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-canvas bg-accent text-[11px] font-bold text-ink-soft">
            +4
          </div>
        </div>

        <Link
          href="/settings"
          aria-label="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-ink-soft hover:text-ink"
        >
          <Settings size={16} />
        </Link>

        <button
          type="button"
          aria-label="Notifications"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-ink-soft hover:text-ink"
        >
          <Bell size={16} />
        </button>

        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            aria-label="Sign out"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-ink-soft hover:text-ink"
          >
            <LogOut size={16} />
          </button>
        </form>

        {(quickActionLabel || editingStore) && (
          <button
            type={pathname === '/settings' || editingStore ? 'submit' : 'button'}
            form={editingStore ? 'store-detail-form' : pathname === '/settings' ? 'settings-form' : undefined}
            className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            {editingStore ? <Save size={15} /> : <Plus size={15} />}
            {editingStore ? 'Save store' : quickActionLabel}
          </button>
        )}
      </div>
    </header>
  );
}
