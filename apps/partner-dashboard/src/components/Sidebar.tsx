'use client';

// Same structural logic as apps/admin's Sidebar (components/layout/
// Sidebar.tsx): one <aside> that resizes width (real toggled state, not
// two separate rail/panel components) — icon-only when collapsed, full
// labels + grouped sections when expanded. Colors/tokens are this app's
// own (light rail, black text, emerald accent), and the Orders badge count
// is real data (this app's own fetchMyOrders-derived count). Active row is
// a white pill (card-shadow + hairline) with an emerald edge bar, inactive
// rows are quiet — the grouped MAIN MENU / TOOLS / bottom-pinned layout.
// Profile/logout live in TopHeader's own dropdown, not here.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { LayoutGrid, ListOrdered, Package, PanelLeftClose, PanelLeftOpen, Search, Settings, Star, Wallet, BarChart3, LifeBuoy } from 'lucide-react';

type NavItem = { href: string; label: string; icon: typeof LayoutGrid };

// Two labelled scroll groups + one pinned-to-bottom group. Bottom group is
// the low-frequency account/help stuff, kept out of the main scroll list.
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Main menu',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutGrid },
      { href: '/orders', label: 'Orders', icon: ListOrdered },
      { href: '/inventory', label: 'Inventory', icon: Package },
      { href: '/payouts', label: 'Payouts', icon: Wallet },
    ],
  },
  {
    label: 'Tools',
    items: [
      { href: '/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/reviews', label: 'Reviews', icon: Star },
    ],
  },
];

const BOTTOM_ITEMS: NavItem[] = [
  { href: '/help', label: 'Help center', icon: LifeBuoy },
  { href: '/settings', label: 'Settings', icon: Settings },
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
  const match = (items: NavItem[]) => items.filter((i) => i.label.toLowerCase().includes(normalizedQuery));
  const groups = NAV_GROUPS.map((g) => ({ ...g, items: match(g.items) })).filter((g) => g.items.length > 0);
  const bottomItems = match(BOTTOM_ITEMS);

  function renderItem(item: NavItem) {
    const isActive = pathname === item.href;
    const badgeCount = item.href === '/orders' ? ordersNeedingActionCount : 0;
    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={clsx(
          'relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
          collapsed && 'justify-center px-0',
          isActive ? 'card-shadow border border-hairline bg-white text-black' : 'text-black/70 hover:bg-black/[0.04]',
        )}
      >
        {/* Emerald edge bar sits flush on the rail's left gutter (aside px-3). */}
        {isActive && !collapsed && (
          <span className="absolute -left-3 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-emerald-600" />
        )}
        <item.icon size={16} className={clsx('shrink-0', isActive ? 'text-emerald-600' : 'text-black/50')} />
        {!collapsed && (
          <span className="flex flex-1 items-center justify-between">
            {item.label}
            {badgeCount > 0 && (
              <span className="tnum rounded-md bg-black/[0.06] px-1.5 py-0.5 text-[11px] font-semibold text-black/60">
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
        'flex h-screen shrink-0 flex-col overflow-y-auto border-r border-hairline bg-neutral-50 px-3 py-4 transition-[width]',
        collapsed ? 'w-[72px]' : 'w-60',
      )}
    >
      {/* Brand header card — logo tile + name + plan, collapse chevron. */}
      <div
        className={clsx(
          'mb-4 flex items-center gap-2.5 rounded-xl border border-hairline bg-white px-2.5 py-2',
          collapsed && 'justify-center px-0',
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black text-sm font-bold text-white">
          {storeName.charAt(0).toUpperCase()}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-black">{storeName}</p>
            <p className="truncate text-xs text-black/50">Flikk Partner</p>
          </div>
        )}
        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse sidebar"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-black/50 hover:bg-black/5 hover:text-black"
          >
            <PanelLeftClose size={16} />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
          className="mb-4 flex h-9 w-9 items-center justify-center self-center rounded-lg text-black/50 hover:bg-black/5 hover:text-black"
        >
          <PanelLeftOpen size={16} />
        </button>
      )}

      {!collapsed ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-black/[0.04] px-3 py-2">
          <Search size={15} className="shrink-0 text-black/40" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent text-sm text-black outline-none placeholder:text-black/40"
          />
          <kbd className="shrink-0 rounded-md border border-hairline bg-white px-1.5 py-0.5 text-[11px] font-medium text-black/40">/</kbd>
        </div>
      ) : (
        <button
          type="button"
          aria-label="Search"
          onClick={() => setCollapsed(false)}
          className="mb-4 flex h-9 w-9 items-center justify-center self-center rounded-lg bg-black/[0.04] text-black/40 hover:text-black"
        >
          <Search size={15} />
        </button>
      )}

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            {!collapsed && (
              <p className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-wider text-black/40 uppercase">{group.label}</p>
            )}
            {group.items.map(renderItem)}
          </div>
        ))}
        {groups.length === 0 && bottomItems.length === 0 && !collapsed && (
          <p className="px-2.5 text-sm text-black/40">No matches.</p>
        )}
      </nav>

      {bottomItems.length > 0 && (
        <div className="mt-4 flex flex-col gap-0.5 border-t border-hairline pt-4">{bottomItems.map(renderItem)}</div>
      )}
    </aside>
  );
}
