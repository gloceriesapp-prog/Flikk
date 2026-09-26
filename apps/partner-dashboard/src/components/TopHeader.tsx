'use client';

// Shared top bar across every (dashboard) page — a breadcrumb on the left
// ("Dashboard / Orders" etc., derived from the route) and status/utility
// icons on the right. The store's own name/accept-orders status lives in
// the Overview page's welcome banner instead (a store owner opens the
// dashboard, not the header chrome, to check "am I visible to customers").
// Support links to the real /help page; Notifications links to /orders
// (the badge counts placed orders needing action — that IS where the owner
// acts on them). No Messages icon: there's no messaging backend, and an
// inert button is worse than none — reinstate it only when a real inbox exists.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { CustomerService01Icon, Notification03Icon } from '@hugeicons/core-free-icons';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { clearTokens } from '@/lib/authStorage';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Overview',
  '/orders': 'Orders',
  '/inventory': 'Inventory',
  '/payouts': 'Payouts',
  '/analytics': 'Analytics',
  '/reviews': 'Reviews',
  '/settings': 'Settings',
  '/help': 'Help & support',
};

interface Props {
  notificationCount: number;
  ownerName: string;
  avatarUrl: string;
}

export function TopHeader({ notificationCount, ownerName, avatarUrl }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const title = PAGE_TITLES[pathname] ?? 'Overview';

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
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-hairline bg-white px-5 lg:px-7">
      {/* Left: page name only — no "Dashboard /" breadcrumb prefix. */}
      <p className="text-xl font-semibold tracking-tight text-neutral-900">{title}</p>

      {/* Right: Support, Alert, Manage profile — each a bordered box. */}
      <div className="flex items-center gap-2.5">
        <Link
          href="/help"
          title="Support"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-hairline bg-white text-black/60 hover:bg-neutral-50"
        >
          <HugeiconsIcon icon={CustomerService01Icon} size={19} />
        </Link>
        <Link
          href="/orders"
          title="Alerts"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-hairline bg-white text-black/60 hover:bg-neutral-50"
        >
          <HugeiconsIcon icon={Notification03Icon} size={19} />
          {notificationCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </Link>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-lg border border-hairline bg-white px-1.5 py-1 hover:bg-neutral-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarUrl} alt={ownerName} className="h-8 w-8 rounded-full border border-neutral-200 object-cover" />
            <span className="text-sm font-medium text-black">{ownerName}</span>
            <ChevronDown size={14} className={`text-black/40 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
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
