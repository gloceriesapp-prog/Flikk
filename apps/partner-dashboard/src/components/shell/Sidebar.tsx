'use client';

// Left navigation for every dashboard page: brand, the store being managed,
// the main menu and the signed-in owner. On large screens it is a fixed
// panel; below lg it becomes a slide-in drawer opened from the header.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { LogOut, MoreVertical, X } from 'lucide-react';
import { clearTokens } from '@/lib/authStorage';
import { useStoreContext } from '@/lib/storeContext';
import { MAIN_NAV, OTHER_NAV, isActivePath, type NavItem } from './nav';

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'G';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  // Close the drawer after navigating.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={clsx(
          'fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px] transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col bg-white p-5 transition-transform duration-200 lg:static lg:z-auto lg:m-3 lg:mr-0 lg:w-[248px] lg:translate-x-0 lg:rounded-[24px] lg:shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
          open ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark />
            <span className="text-[19px] font-semibold tracking-tight text-ink">gloceries</span>
          </Link>
          <button type="button" onClick={onClose} aria-label="Close menu" className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden">
            <X size={18} />
          </button>
        </div>

        <StoreCard />

        <nav className="mt-6 flex min-h-0 flex-1 flex-col overflow-y-auto">
          <p className="px-3 text-xs font-medium text-slate-400">Menu</p>
          <ul className="mt-2 space-y-1">
            {MAIN_NAV.map((item) => (
              <NavLink key={item.href} item={item} active={isActivePath(pathname, item.href)} />
            ))}
          </ul>
          <div className="my-5 h-px bg-slate-100" />
          <p className="px-3 text-xs font-medium text-slate-400">Others</p>
          <ul className="mt-2 space-y-1">
            {OTHER_NAV.map((item) => (
              <NavLink key={item.href} item={item} active={isActivePath(pathname, item.href)} />
            ))}
          </ul>
        </nav>

        <OwnerCard />
      </aside>
    </>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const { newOrderCount } = useStoreContext();
  const Icon = item.icon;
  const badge = item.href === '/orders' && newOrderCount > 0 ? newOrderCount : 0;
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={clsx(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors',
          active
            ? 'bg-gradient-to-b from-[#2f6dfd] to-accent text-white shadow-[0_6px_16px_-6px_rgba(21,93,252,0.6)]'
            : 'text-slate-600 hover:bg-slate-50 hover:text-ink',
        )}
      >
        <Icon size={18} strokeWidth={1.8} />
        <span className="flex-1">{item.label}</span>
        {badge > 0 && (
          <span
            className={clsx(
              'tnum min-w-5 rounded-full px-1.5 text-center text-[11px] font-semibold leading-5',
              active ? 'bg-white/25 text-white' : 'bg-accent text-white',
            )}
          >
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </Link>
    </li>
  );
}

function StoreCard() {
  const { store } = useStoreContext();
  const online = Boolean(store?.is_active) && !store?.admin_suspended;
  return (
    <Link
      href="/settings"
      className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-2.5 transition-colors hover:border-slate-200"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent-soft text-sm font-semibold text-accent">
        {store?.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.photo_url} alt="" className="h-full w-full object-cover" />
        ) : (
          initialsOf(store?.name ?? 'Store')
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{store?.name ?? 'Your store'}</span>
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className={clsx('h-1.5 w-1.5 rounded-full', online ? 'bg-emerald-500' : 'bg-slate-300')} />
          {store?.admin_suspended ? 'Suspended' : online ? 'Accepting orders' : 'Offline'}
        </span>
      </span>
    </Link>
  );
}

function OwnerCard() {
  const { me } = useStoreContext();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const name = me.name ?? 'Store owner';

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    }
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, []);

  return (
    <div ref={ref} className="relative mt-4">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-100 p-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
          {initialsOf(name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{name}</span>
          <span className="block text-xs text-slate-500">Store owner</span>
        </span>
        <button
          type="button"
          aria-label="Account menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink"
        >
          <MoreVertical size={16} />
        </button>
      </div>
      {menuOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              clearTokens();
              router.replace('/login');
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut size={16} /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

// The Gloceries cart-"G" mark in the brand blue.
export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="brand-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b7bff" />
          <stop offset="1" stopColor="#155dfc" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#brand-mark)" />
      <path d="M7 8.5h3.2l1 3.6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M22.6 13.2a6.4 6.4 0 1 0 .4 4.2h-5.2" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="12.5" cy="25" r="1.8" fill="#fff" />
      <circle cx="21" cy="25" r="1.8" fill="#fff" />
    </svg>
  );
}
