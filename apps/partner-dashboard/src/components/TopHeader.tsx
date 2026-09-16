'use client';

// Shared top bar across every (dashboard) page — a breadcrumb on the left
// ("Dashboard / Orders" etc., derived from the route) and status/utility
// icons on the right. The store's own name/accept-orders status lives in
// the Overview page's welcome banner instead (a store owner opens the
// dashboard, not the header chrome, to check "am I visible to customers").
// Support/Message/Notification are UI-only for now (no backend behind
// them yet) — same "UI exists, flow not wired" convention the rest of
// this codebase already uses rather than fabricating a fake destination.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { CustomerService01Icon, Message01Icon, Notification03Icon } from '@hugeicons/core-free-icons';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { clearTokens } from '@/lib/authStorage';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Overview',
  '/orders': 'Orders',
  '/inventory': 'Inventory',
  '/payouts': 'Payouts',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
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
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 bg-[#F7F8FA] px-8">
      <p className="text-[15px]">
        <span className="text-neutral-400">Dashboard</span>
        <span className="mx-2 text-neutral-300">/</span>
        <span className="font-bold text-black">{title}</span>
      </p>

      <div className="flex items-center gap-1">
        <button type="button" title="Support" className="flex h-9 w-9 items-center justify-center rounded-lg text-black/60 hover:bg-black/5">
          <HugeiconsIcon icon={CustomerService01Icon} size={19} />
        </button>
        <button type="button" title="Messages" className="flex h-9 w-9 items-center justify-center rounded-lg text-black/60 hover:bg-black/5">
          <HugeiconsIcon icon={Message01Icon} size={19} />
        </button>
        <button
          type="button"
          title="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-black/60 hover:bg-black/5"
        >
          <HugeiconsIcon icon={Notification03Icon} size={19} />
          {notificationCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>

        <div className="mx-2 h-6 w-px bg-neutral-200" />

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-black/5"
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
