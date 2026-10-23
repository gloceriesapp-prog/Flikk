'use client';

// Page header: the current page's title, the store's online switch (the one
// control an owner needs from every page) and shortcuts to new orders and
// settings. Below lg it also opens the navigation drawer.

import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Menu } from 'lucide-react';
import { StoreProfileLink } from './StoreProfileLink';
import { NotificationMenu } from '@/components/notifications/NotificationMenu';
import { useStoreContext } from '@/lib/storeContext';
import { navItemFor } from './nav';

export function AppHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();
  const item = navItemFor(pathname);

  return (
    <header className="flex w-full items-center gap-3 border-b border-slate-200/60 bg-white px-3 py-3 sm:px-4">
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

      <NotificationMenu />
      <StoreProfileLink />
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
        'flex h-10 shrink-0 items-center gap-2 rounded-full border pl-1.5 pr-3 text-sm font-medium transition-colors disabled:cursor-not-allowed',
        online ? 'border-slate-200 bg-white text-ink' : 'border-slate-200 bg-white text-slate-600',
        isTogglingOnline && 'opacity-60',
      )}
    >
      <span className={clsx('relative h-5 w-9 shrink-0 rounded-full transition-colors', online ? 'bg-emerald-500' : 'bg-slate-300')}>
        <span
          className={clsx(
            'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform',
            online ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </span>
      <span className="hidden sm:inline">{suspended ? 'Suspended' : online ? 'Online' : 'Offline'}</span>
    </button>
  );
}
