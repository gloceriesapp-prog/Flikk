'use client';

// Replicates the reference sidebar's exact structure: logo + collapse
// toggle, search with a ⌘K hint, grouped "Menu"/"Insights" sections with
// a white active-pill, and a bottom Help Center/Settings/profile stack.
// Collapse is a real toggled state (icon-only rail), not just cosmetic.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, HelpCircle, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react';
import clsx from 'clsx';
import { NAV_GROUPS, OVERVIEW_ITEM, type NavItem } from '@/lib/nav';
import { useAdminRealtime } from '@/lib/realtime/useAdminRealtime';
import { SidebarSearch } from './SidebarSearch';

interface AttentionItem { key: string; label: string; count: number; href: string }

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  // Which groups are folded shut (by title). Default: all open. Clicking a
  // group header toggles it; the group holding the active route is forced
  // open so the current page is always visible.
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});
  // Bumped by the collapsed rail's search button so SidebarSearch focuses
  // its input once the sidebar has expanded.
  const [searchFocus, setSearchFocus] = useState(0);
  // "Needs attention" counts, keyed by nav href — a red badge next to any
  // item with a non-zero count. Same source as the TopNav bell: the single
  // /api/attention aggregate (admin_attention_counts RPC, one SQL call),
  // instead of pulling every row from four endpoints just to count them.
  // Several attention keys share a href (store/rider/product approvals all
  // land on /approvals), so counts are grouped by href and summed.
  const [counts, setCounts] = useState<Record<string, number>>({});

  const loadCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/attention', { cache: 'no-store' });
      if (!res.ok) return; // keep last-known counts on a failed round
      const { items } = (await res.json()) as { items: AttentionItem[] };
      const next: Record<string, number> = {};
      for (const item of items) {
        next[item.href] = (next[item.href] ?? 0) + item.count;
      }
      setCounts(next);
    } catch {
      // Best-effort — a failed fetch just leaves the badges at their last
      // known counts.
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadCounts);
  }, [loadCounts]);
  useAdminRealtime(loadCounts);
  // Polling fallback for envs where Supabase Realtime isn't wired yet
  // (same reason the Approvals page polls) — badges still stay current.
  useEffect(() => {
    const id = setInterval(loadCounts, 15_000);
    return () => clearInterval(id);
  }, [loadCounts]);

  const isActiveHref = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  function renderItem(item: NavItem) {
    const isActive = isActiveHref(item.href);
    const Icon = item.icon;
    const count = counts[item.href] ?? 0;
    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={clsx(
          'relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
          collapsed && 'justify-center px-0',
          isActive ? 'bg-card text-ink shadow-sm' : 'text-ink-soft hover:bg-card/60 hover:text-ink'
        )}
      >
        <Icon size={17} className="shrink-0" />
        {!collapsed && (
          <span className="flex flex-1 items-center justify-between">
            {item.label}
            {count > 0 && (
              <span
                className={clsx(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                  isActive ? 'bg-ink text-white' : 'bg-danger/10 text-danger'
                )}
              >
                {count}
              </span>
            )}
          </span>
        )}
        {/* Collapsed rail: a tiny red dot instead of the number, so an item
            needing attention is still visible without room for the count. */}
        {collapsed && count > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" />}
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
            <span className="text-sm font-semibold text-ink">Gloceries Admin</span>
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
        <SidebarSearch focusSignal={searchFocus} />
      ) : (
        <button
          type="button"
          aria-label="Search"
          onClick={() => { setCollapsed(false); setSearchFocus((n) => n + 1); }}
          className="mb-5 flex h-9 w-9 items-center justify-center self-center rounded-xl border border-border bg-card text-muted hover:text-ink"
        >
          <Search size={14} />
        </button>
      )}

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {/* Overview — standalone, above the groups */}
        {renderItem(OVERVIEW_ITEM)}

        {NAV_GROUPS.map((group) => {
          const hasActive = group.items.some((i) => isActiveHref(i.href));
          const open = collapsed || hasActive || !closedGroups[group.title];
          const groupCount = group.items.reduce((n, i) => n + (counts[i.href] ?? 0), 0);
          return (
            <div key={group.title} className="flex flex-col gap-1">
              {!collapsed ? (
                <button
                  type="button"
                  onClick={() => setClosedGroups((g) => ({ ...g, [group.title]: !g[group.title] }))}
                  className="mt-3 flex items-center justify-between px-3 pb-1 text-xs font-semibold text-muted hover:text-ink"
                >
                  <span className="flex items-center gap-1.5">
                    {group.title}
                    {!open && groupCount > 0 && (
                      <span className="rounded-full bg-danger/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-danger">{groupCount}</span>
                    )}
                  </span>
                  <ChevronDown size={13} className={clsx('transition-transform', !open && '-rotate-90')} />
                </button>
              ) : (
                // Collapsed rail: a thin divider stands in for each group header.
                <div className="mx-auto my-1.5 h-px w-5 bg-border" />
              )}
              {open && group.items.map(renderItem)}
            </div>
          );
        })}
      </nav>

      <div className="flex flex-col gap-1 border-t border-border pt-3">
        <Link
          href="/support"
          title={collapsed ? 'Help Center' : undefined}
          className={clsx(
            'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-ink-soft hover:bg-card hover:text-ink',
            collapsed && 'justify-center px-0'
          )}
        >
          <HelpCircle size={17} />
          {!collapsed && 'Help Center'}
        </Link>

        <div
          className={clsx(
            'mt-2 flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5',
            collapsed && 'justify-center px-0'
          )}
        >
          <div className="h-8 w-8 shrink-0 rounded-full bg-accent" />
          {!collapsed && (
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-xs font-semibold text-ink">Founder</p>
              <p className="truncate text-[10px] text-muted">founder@flikk.app</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
