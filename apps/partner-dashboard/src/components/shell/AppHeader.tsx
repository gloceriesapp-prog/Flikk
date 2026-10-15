'use client';

// Page header: the current page's title, the store's online switch (the one
// control an owner needs from every page) and shortcuts to new orders and
// settings. Below lg it also opens the navigation drawer.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Bell, Menu, Settings } from 'lucide-react';
import { useStoreContext } from '@/lib/storeContext';
import { navItemFor } from './nav';

export function AppHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();
  const item = navItemFor(pathname);
  const { newOrderCount } = useStoreContext();

  return (
    <header className="flex items-center gap-3 rounded-[20px] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="-ml-1 rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
      >
        <Menu size={20} />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[22px] font-semibold leading-tight text-ink sm:text-2xl">{item?.label ?? 'Dashboard'}</h1>
        {item && <p className="mt-0.5 hidden truncate text-sm text-slate-500 sm:block">{item.subtitle}</p>}
      </div>

      <OnlineSwitch />

      <Link
        href="/orders"
        aria-label={newOrderCount > 0 ? `${newOrderCount} new orders` : 'Orders'}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 hover:text-ink"
      >
        <Bell size={18} strokeWidth={1.8} />
        {newOrderCount > 0 && (
          <span className="tnum absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white ring-2 ring-white">
            {newOrderCount > 9 ? '9+' : newOrderCount}
          </span>
        )}
      </Link>
      <Link
        href="/settings"
        aria-label="Settings"
        className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 hover:text-ink sm:flex"
      >
        <Settings size={18} strokeWidth={1.8} />
      </Link>
    </header>
  );
}

function OnlineSwitch() {
  const { store, isTogglingOnline, setOnline } = useStoreContext();
  if (!store) return null;
  const suspended = Boolean(store.admin_suspended);
  const online = store.is_active && !suspended;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={online}
      disabled={isTogglingOnline || suspended}
      onClick={() => void setOnline(!online)}
      title={suspended ? (store.suspended_reason ?? 'Suspended by Gloceries') : online ? 'Tap to stop taking orders' : 'Tap to start taking orders'}
      className={clsx(
        'flex shrink-0 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-sm font-medium transition-colors disabled:cursor-not-allowed',
        online ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600',
        isTogglingOnline && 'opacity-60',
      )}
    >
      <span className={clsx('relative h-5 w-9 shrink-0 rounded-full transition-colors', online ? 'bg-emerald-500' : 'bg-slate-300')}>
        <span
          className={clsx(
            'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
            online ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </span>
      <span className="hidden sm:inline">{suspended ? 'Suspended' : online ? 'Online' : 'Offline'}</span>
    </button>
  );
}
