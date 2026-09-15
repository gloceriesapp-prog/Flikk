'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { LayoutGrid, ListOrdered, Package, Wallet, BarChart3, Settings, LogOut } from 'lucide-react';
import { clearTokens } from '@/lib/authStorage';

const NAV_ITEMS = [
  { href: '/', label: 'Overview', icon: LayoutGrid },
  { href: '/orders', label: 'Orders', icon: ListOrdered },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/payouts', label: 'Payouts', icon: Wallet },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

export function Sidebar({ storeName }: { storeName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-neutral-200 bg-white px-4 py-5">
      <div className="px-2 pb-6">
        <p className="text-lg font-semibold text-neutral-900">Flikk Partner</p>
        <p className="mt-0.5 truncate text-sm text-neutral-500">{storeName}</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100',
              )}
            >
              <item.icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => {
          clearTokens();
          router.replace('/login');
        }}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-500 hover:bg-neutral-100"
      >
        <LogOut size={17} />
        Log out
      </button>
    </aside>
  );
}
