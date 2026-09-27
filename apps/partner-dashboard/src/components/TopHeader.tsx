'use client';

// The one top navbar for every (dashboard) page — brand on the left, the
// full nav (moved here out of the old sidebar) as a centered pill row, and
// utility icons + profile dropdown on the right. Active route is a lime pill
// (ink text — white fails AA on lime, CLAUDE.md). Support links to /help;
// the bell links to /orders (badge = placed orders needing action); Settings
// + logout live in the avatar dropdown. No Messages icon: no inbox backend.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { NotificationIcon } from '@/components/icons';
import { clearTokens } from '@/lib/authStorage';

type NavItem = { href: string; label: string };

// Flattened from the old sidebar's Main menu + Tools groups. Help + Settings
// intentionally stay off the pill row (avatar dropdown carries Settings).
const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard' },
  { href: '/orders', label: 'Orders' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/payouts', label: 'Payouts' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/reviews', label: 'Reviews' },
];

interface Props {
  storeName: string;
  notificationCount: number;
  ownerName: string;
  avatarUrl: string;
}

export function TopHeader({ storeName, notificationCount, ownerName, avatarUrl }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsMenuOpen(false);
    }
    window.addEventListener('mousedown', onClickOutside);
    return () => window.removeEventListener('mousedown', onClickOutside);
  }, []);

  function handleLogout() {
    clearTokens();
    router.replace('/login');
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 bg-[#fbfafa] px-4 lg:px-6">
      {/* Left: brand tile + store name */}
      <Link href="/" className="flex shrink-0 items-center">
        <span className="text-xl font-semibold text-black tracking-tight">
          Groceries Partner
        </span>
      </Link>

      {/* Center: nav grouped inside one floating rounded pill container.
          Text-only items; active route is a lime pill (ink text — white
          fails AA on lime). Scrolls horizontally on narrow screens. */}
      <nav className="flex flex-1 justify-center">
        <div className="flex items-center gap-1 overflow-x-auto rounded-full border border-hairline bg-white p-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            // Red dot on Orders = unacknowledged placed orders. Being on the
            // /orders page IS the acknowledgement, so the dot clears there and
            // returns only if a new placed order arrives while you're elsewhere.
            const showDot = item.href === '/orders' && notificationCount > 0 && pathname !== '/orders';
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'relative flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-[#A8D93A] text-[#101C10]' : 'text-black/60 hover:bg-black/[0.04] hover:text-black',
                )}
              >
                {item.label}
                {showDot && (
                  <span
                    aria-label={`${notificationCount} new ${notificationCount === 1 ? 'order' : 'orders'}`}
                    className="absolute top-1 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Right: bell and profile in two separate white capsules. */}
      <div className="flex shrink-0 items-center gap-2.5">
        <Link
          href="/orders"
          title="Alerts"
          className="relative flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-white text-black/70 shadow-sm hover:bg-neutral-50"
        >
          <NotificationIcon size={20} />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </Link>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-full border border-hairline bg-white py-1 pl-1 pr-2.5 shadow-sm hover:bg-neutral-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarUrl} alt={ownerName} className="h-9 w-9 rounded-full border border-neutral-200 object-cover" />
            <div className="hidden text-left leading-tight sm:block">
              <p className="text-sm font-semibold text-black">{ownerName}</p>
              <p className="text-xs text-black/50">Partner</p>
            </div>
            <ChevronDown size={15} className={`text-black/40 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isMenuOpen && (
            <div className="absolute top-full right-0 z-10 mt-2 w-52 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1.5 shadow-lg">
              <Link
                href="/settings"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-black hover:bg-black/5"
              >
                <UserRound size={16} className="text-black/60" /> Edit profile
              </Link>
              <div className="my-1 h-px bg-neutral-100" />
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut size={16} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
