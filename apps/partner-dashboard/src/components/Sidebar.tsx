'use client';

// Same structural logic as apps/admin's Sidebar (components/layout/
// Sidebar.tsx): one <aside> that resizes width (real toggled state, not
// two separate rail/panel components) — icon-only when collapsed, full
// labels + grouped sections when expanded. Colors/tokens are this app's
// own (#FFFFFF, black text, amber accent), and the Orders badge count is
// real data (this app's own fetchMyOrders-derived count), not admin's own
// placeholder pattern. Profile/logout live in TopHeader's own dropdown
// now, not here — one account menu, not two.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { LayoutGrid, ListOrdered, Package, PanelLeftClose, PanelLeftOpen, Search, Settings, Wallet, BarChart3 } from 'lucide-react';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ href: '/', label: 'Dashboard', icon: LayoutGrid }],
  },
  {
    label: 'Operations',
    items: [
      { href: '/orders', label: 'Orders', icon: ListOrdered },
      { href: '/inventory', label: 'Inventory', icon: Package },
      { href: '/payouts', label: 'Payouts', icon: Wallet },
    ],
  },
  {
    label: 'Insights',
    items: [{ href: '/analytics', label: 'Analytics', icon: BarChart3 }],
  },
  {
    label: 'Account',
    items: [{ href: '/settings', label: 'Settings', icon: Settings }],
  },
];

interface Props {
  storeName: string;
  ordersNeedingActionCount: number;
}

export function Sidebar({ storeName, ordersNeedingActionCount }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        setCollapsed(false);
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.label.toLowerCase().includes(normalizedQuery)),
  })).filter((group) => group.items.length > 0);

  function renderItem(item: { href: string; label: string; icon: typeof LayoutGrid }) {
    const isActive = pathname === item.href;
    const badgeCount = item.href === '/orders' ? ordersNeedingActionCount : 0;
    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={clsx(
          'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-black transition-colors',
          collapsed && 'justify-center px-0',
          isActive ? 'bg-amber-50' : 'hover:bg-black/5',
        )}
      >
        <item.icon size={16} className={clsx('shrink-0', isActive ? 'text-amber-600' : 'text-black/60')} />
        {!collapsed && (
          <span className="flex flex-1 items-center justify-between">
            {item.label}
            {badgeCount > 0 && (
              <span
                className={clsx(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                  isActive ? 'bg-amber-600 text-white' : 'bg-red-500/10 text-red-600',
                )}
              >
                {badgeCount}
              </span>
            )}
          </span>
        )}
      </Link>
    );
  }

  return (
    <aside
      className={clsx(
        'flex h-screen shrink-0 flex-col overflow-y-auto border-r border-neutral-200 bg-[#FFFFFF] px-3 py-4 transition-[width]',
        collapsed ? 'w-[72px]' : 'w-64',
      )}
    >
      <div className={clsx('mb-4 flex items-center px-1', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-[15px] font-extrabold tracking-tight text-black">Flikk Partner</p>
            <p className="truncate text-xs text-black/60">{storeName}</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-black/50 hover:bg-black/5 hover:text-black"
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {!collapsed ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2">
          <Search size={15} className="shrink-0 text-black/40" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent text-sm text-black outline-none placeholder:text-black/40"
          />
          <kbd className="shrink-0 rounded-md border border-neutral-200 bg-[#FFFFFF] px-1.5 py-0.5 text-[11px] font-medium text-black/40">
            /
          </kbd>
        </div>
      ) : (
        <button
          type="button"
          aria-label="Search"
          onClick={() => setCollapsed(false)}
          className="mb-4 flex h-9 w-9 items-center justify-center self-center rounded-lg border border-neutral-200 bg-white text-black/40 hover:text-black"
        >
          <Search size={15} />
        </button>
      )}

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            {!collapsed && <p className="px-2.5 pb-1 text-[11px] font-semibold tracking-wider text-black/50 uppercase">{group.label}</p>}
            {group.items.map(renderItem)}
          </div>
        ))}
        {groups.length === 0 && !collapsed && <p className="px-2.5 text-sm text-black/40">No matches.</p>}
      </nav>
    </aside>
  );
}
