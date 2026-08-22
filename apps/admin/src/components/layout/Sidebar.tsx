'use client';

// Replicates the reference sidebar's exact structure: logo + collapse
// toggle, search with a ⌘K hint, grouped "Menu"/"Insights" sections with
// a white active-pill, and a bottom Help Center/Settings/profile stack.
// Collapse is a real toggled state (icon-only rail), not just cosmetic.

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronsUpDown, HelpCircle, PanelLeftClose, PanelLeftOpen, Search, Settings } from 'lucide-react';
import clsx from 'clsx';
import { INSIGHTS_ITEMS, MENU_ITEMS, type NavItem } from '@/lib/nav';
import { PLACEHOLDER_APPLICATIONS } from '@/lib/mock-data';

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const pendingCount = PLACEHOLDER_APPLICATIONS.filter((a) => a.status === 'pending').length;

  function renderItem(item: NavItem) {
    const isActive = pathname.startsWith(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={clsx(
          'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
          collapsed && 'justify-center px-0',
          isActive ? 'bg-card text-ink shadow-sm' : 'text-ink-soft hover:bg-card/60 hover:text-ink'
        )}
      >
        <Icon size={17} className="shrink-0" />
        {!collapsed && (
          <span className="flex flex-1 items-center justify-between">
            {item.label}
            {item.href === '/approvals' && pendingCount > 0 && (
              <span
                className={clsx(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                  isActive ? 'bg-ink text-white' : 'bg-danger/10 text-danger'
                )}
              >
                {pendingCount}
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
        'flex h-full shrink-0 flex-col overflow-y-auto border-r border-border bg-canvas px-3 py-5 transition-[width]',
        collapsed ? 'w-[76px]' : 'w-64'
      )}
    >
      <div className={clsx('mb-4 flex items-center px-1', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-sm font-bold text-white">F</div>
            <span className="text-sm font-semibold text-ink">Flikk Admin</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-card hover:text-ink"
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {!collapsed ? (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
          <Search size={14} className="text-muted" />
          <span className="flex-1 text-sm text-muted">Search</span>
          <kbd className="rounded-md border border-border bg-canvas px-1.5 py-0.5 text-[10px] font-semibold text-muted">
            ⌘K
          </kbd>
        </div>
      ) : (
        <button
          type="button"
          aria-label="Search"
          className="mb-5 flex h-9 w-9 items-center justify-center self-center rounded-xl border border-border bg-card text-muted hover:text-ink"
        >
          <Search size={14} />
        </button>
      )}

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto">
        <div className="flex flex-col gap-1">
          {!collapsed && <p className="px-3 pb-1 text-xs font-semibold text-muted">Menu</p>}
          {MENU_ITEMS.map(renderItem)}
        </div>
        <div className="flex flex-col gap-1">
          {!collapsed && <p className="px-3 pb-1 text-xs font-semibold text-muted">Insights</p>}
          {INSIGHTS_ITEMS.map(renderItem)}
        </div>
      </nav>

      <div className="flex flex-col gap-1 border-t border-border pt-3">
        <Link
          href="#"
          title={collapsed ? 'Help Center' : undefined}
          className={clsx(
            'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-ink-soft hover:bg-card hover:text-ink',
            collapsed && 'justify-center px-0'
          )}
        >
          <HelpCircle size={17} />
          {!collapsed && 'Help Center'}
        </Link>
        <Link
          href="/settings"
          title={collapsed ? 'Settings' : undefined}
          className={clsx(
            'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
            collapsed && 'justify-center px-0',
            pathname.startsWith('/settings') ? 'bg-card text-ink shadow-sm' : 'text-ink-soft hover:bg-card hover:text-ink'
          )}
        >
          <Settings size={17} />
          {!collapsed && 'Settings'}
        </Link>

        <div
          className={clsx(
            'mt-2 flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5',
            collapsed && 'justify-center px-0'
          )}
        >
          <div className="h-8 w-8 shrink-0 rounded-full bg-accent" />
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-xs font-semibold text-ink">Founder</p>
                <p className="truncate text-[10px] text-muted">founder@flikk.app</p>
              </div>
              <ChevronsUpDown size={14} className="shrink-0 text-muted" />
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
