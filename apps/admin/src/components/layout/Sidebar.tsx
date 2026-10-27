'use client';

// Replicates the reference sidebar's exact structure: logo + collapse
// toggle, search with a ⌘K hint, grouped "Menu"/"Insights" sections with
// a white active-pill, and a bottom Help Center/Settings/profile stack.
// Collapse is a real toggled state (icon-only rail), not just cosmetic.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, HelpCircle, PanelLeftClose, PanelLeftOpen, Search } from '@/components/icons';
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
        aria-current={isActive ? 'page' : undefined}
        className={clsx(
          'group relative flex items-center gap-2.5 rounded-[10px] px-2.5 py-[7px] text-[13px] font-medium transition-colors',
          collapsed && 'justify-center px-0',
          isActive ? 'bg-white/[0.09] text-white' : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
        )}
      >
        {isActive && <span className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand" />}
        <Icon size={17} className={clsx('shrink-0', isActive ? 'text-white' : 'text-sidebar-text group-hover:text-white')} />
        {!collapsed && (
          <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
            <span className="truncate">{item.label}</span>
            {count > 0 && (
              <span className="rounded-full bg-danger px-1.5 py-px text-[10px] font-bold tabular-nums text-white">{count}</span>
            )}
          </span>
        )}
        {collapsed && count > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger ring-2 ring-sidebar" />}
      </Link>
    );
  }

  return (
    <aside
      className={clsx(
        'flex h-full shrink-0 flex-col bg-sidebar px-3 pb-3 pt-4 transition-[width] duration-200',
        collapsed ? 'w-[72px]' : 'w-[248px]'
      )}
    >
      <div className={clsx('mb-5 flex items-center px-1', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand-mark.png" alt="" className="h-8 w-8 rounded-[9px]" />
            <div className="leading-tight">
              <p className="text-[14px] font-semibold tracking-tight text-white">Gloceries</p>
              <p className="text-[11px] font-medium text-sidebar-text">Admin console</p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-sidebar-text hover:bg-sidebar-hover hover:text-white"
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
          className="mb-4 flex h-9 w-9 items-center justify-center self-center rounded-[10px] border border-white/[0.08] text-sidebar-text hover:text-white"
        >
          <Search size={14} />
        </button>
      )}

      <nav className="-mx-1 flex flex-1 flex-col gap-0.5 overflow-y-auto px-1 pb-2 [scrollbar-color:#2a2f38_transparent]">
        {renderItem(OVERVIEW_ITEM)}

        {NAV_GROUPS.map((group) => {
          const hasActive = group.items.some((i) => isActiveHref(i.href));
          const open = collapsed || hasActive || !closedGroups[group.title];
          const groupCount = group.items.reduce((n, i) => n + (counts[i.href] ?? 0), 0);
          return (
            <div key={group.title} className="flex flex-col gap-0.5">
              {!collapsed ? (
                <button
                  type="button"
                  onClick={() => setClosedGroups((g) => ({ ...g, [group.title]: !g[group.title] }))}
                  className="mt-4 flex items-center justify-between px-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#6b7280] hover:text-sidebar-text"
                >
                  <span className="flex items-center gap-1.5">
                    {group.title}
                    {!open && groupCount > 0 && (
                      <span className="rounded-full bg-danger px-1.5 text-[10px] font-bold tabular-nums text-white">{groupCount}</span>
                    )}
                  </span>
                  <ChevronDown size={12} className={clsx('transition-transform', !open && '-rotate-90')} />
                </button>
              ) : (
                <div className="mx-auto my-2 h-px w-5 bg-white/10" />
              )}
              {open && group.items.map(renderItem)}
            </div>
          );
        })}
      </nav>

      <div className="flex flex-col gap-1 border-t border-white/[0.08] pt-3">
        <Link
          href="/support"
          title={collapsed ? 'Help Center' : undefined}
          className={clsx(
            'flex items-center gap-2.5 rounded-[10px] px-2.5 py-[7px] text-[13px] font-medium text-sidebar-text hover:bg-sidebar-hover hover:text-white',
            collapsed && 'justify-center px-0'
          )}
        >
          <HelpCircle size={17} />
          {!collapsed && 'Help Center'}
        </Link>
        <div className={clsx('mt-1 flex items-center gap-2.5 rounded-[10px] bg-white/[0.04] px-2.5 py-2', collapsed && 'justify-center px-0')}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-[12px] font-semibold text-white">F</div>
          {!collapsed && (
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-semibold text-white">Founder</p>
              <p className="truncate text-[11px] text-sidebar-text">Signed in · admin</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
