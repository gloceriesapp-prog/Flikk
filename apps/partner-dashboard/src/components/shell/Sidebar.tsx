'use client';

// Left navigation for every dashboard page: brand, the grouped menu and the
// store / owner footer. On large screens it is a fixed panel; below lg it
// becomes a slide-in drawer opened from the header.

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import { ChevronDown, LogOut, MoreHorizontal, X } from 'lucide-react';
import { clearTokens } from '@/lib/authStorage';
import { useStoreContext } from '@/lib/storeContext';
import { NAV_SECTIONS, isActivePath, type NavChild, type NavItem } from './nav';

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
          'fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col bg-white transition-transform duration-200 lg:static lg:z-auto lg:m-3 lg:mr-0 lg:w-[256px] lg:translate-x-0 lg:rounded-[24px] lg:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_0_0_1px_rgba(15,23,42,0.03)]',
          open ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-5 pb-5 pt-6">
          <Link href="/" className="group flex items-center gap-3">
            <span className="rounded-[11px] shadow-[0_6px_14px_-6px_rgba(21,93,252,0.65)] transition-transform group-hover:scale-[1.04]">
              <BrandMark size={32} />
            </span>
            <span className="text-[17px] font-semibold tracking-[-0.02em] text-[#111318]">Gloceries Partner</span>
          </Link>
          <button type="button" onClick={onClose} aria-label="Close menu" className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden">
            <X size={18} />
          </button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-3">
          {NAV_SECTIONS.map((section, index) => (
            <div key={section.title ?? index} className="border-t border-[#EFEFF1] pt-4 pb-3">
              {section.title && (
                <p className="mb-2 px-3 text-[11.5px] font-medium uppercase tracking-[0.08em] text-[#9A9DA6]">{section.title}</p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) =>
                  item.children ? (
                    // useSearchParams needs a Suspense boundary for prerendering.
                    <Suspense key={item.href} fallback={<NavLink item={item} active={isActivePath(pathname, item.href)} />}>
                      <NavGroup item={item} pathname={pathname} />
                    </Suspense>
                  ) : (
                    <NavLink key={item.href} item={item} active={isActivePath(pathname, item.href)} />
                  ),
                )}
              </ul>
            </div>
          ))}
        </nav>

        <AccountFooter />
      </aside>
    </>
  );
}

const ROW = 'flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[15px] transition-colors';

function NavLink({ item, active, trailing }: { item: NavItem; active: boolean; trailing?: React.ReactNode }) {
  const { newOrderCount } = useStoreContext();
  const Icon = item.icon;
  const badge = item.href === '/orders' && newOrderCount > 0 ? newOrderCount : 0;
  return (
    <li className="relative">
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={clsx(
          ROW,
          active
            ? 'bg-[#EEEFF1] font-semibold text-[#111318] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.03)]'
            : 'font-medium text-[#2A2D34] hover:bg-[#F6F6F7] hover:text-[#111318]',
        )}
      >
        <Icon size={19} strokeWidth={active ? 2.2 : 1.7} className={active ? 'text-[#111318]' : 'text-[#3A3D45]'} />
        <span className="flex-1 truncate">{item.label}</span>
        {badge > 0 && (
          <span className="tnum rounded-full bg-[#E5484D] px-2 text-[11px] font-semibold leading-5 text-white shadow-[0_4px_10px_-4px_rgba(229,72,77,0.7)]">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
        {trailing && <span className="w-5" />}
      </Link>
      {trailing}
    </li>
  );
}

// An item with a sub-menu: the item itself (active only when no sub-filter is
// chosen), a chevron to fold it and a branch tree of dotted children.
function NavGroup({ item, pathname }: { item: NavItem; pathname: string }) {
  const searchParams = useSearchParams();
  const [expanded, setExpanded] = useState(true);
  const children = item.children ?? [];
  const onSection = isActivePath(pathname, item.href);
  const activeChild = onSection ? children.find((child) => isChildActive(child, searchParams)) : undefined;

  return (
    <>
      <NavLink
        item={item}
        active={onSection && !activeChild}
        trailing={
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-label={expanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
            aria-expanded={expanded}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#3A3D45] hover:bg-black/5"
          >
            <ChevronDown size={16} strokeWidth={2} className={clsx('transition-transform duration-200', expanded ? 'rotate-180' : '')} />
          </button>
        }
      />
      {expanded && (
        <li>
          <ul className="ml-[21px] pb-1">
            {children.map((child, index) => {
              const active = child === activeChild;
              const last = index === children.length - 1;
              return (
                <li key={child.href} className="relative pl-5">
                  {/* Branch: a rail down from the parent, curving into each row. */}
                  {!last && <span aria-hidden="true" className="absolute inset-y-0 left-0 border-l border-[#DCDDE1]" />}
                  <span aria-hidden="true" className="absolute left-0 top-0 h-1/2 w-3.5 rounded-bl-[8px] border-b border-l border-[#DCDDE1]" />
                  <Link
                    href={child.href}
                    aria-current={active ? 'page' : undefined}
                    className={clsx(
                      'flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[14.5px] transition-colors',
                      active ? 'bg-[#EEEFF1] font-semibold text-[#111318]' : 'font-medium text-[#2A2D34] hover:bg-[#F6F6F7] hover:text-[#111318]',
                    )}
                  >
                    <span className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', child.dot)} />
                    <span className="truncate">{child.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </li>
      )}
    </>
  );
}

function isChildActive(child: NavChild, searchParams: URLSearchParams): boolean {
  const target = new URL(child.href, 'http://x').searchParams;
  return [...target.entries()].every(([key, value]) => searchParams.get(key) === value);
}

// The store being managed, its live status and the owner's account menu.
function AccountFooter() {
  const { me, store } = useStoreContext();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const online = Boolean(store?.is_active) && !store?.admin_suspended;
  const status = store?.admin_suspended ? 'Suspended' : online ? 'Accepting orders' : 'Offline';

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    }
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, []);

  return (
    <div ref={ref} className="relative border-t border-[#EFEFF1] p-3">
      <div className="flex items-center gap-3 rounded-[14px] p-2 transition-colors hover:bg-[#F6F6F7]">
        <Link href="/settings" className="flex min-w-0 flex-1 items-center gap-3">
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#111318] text-sm font-semibold text-white">
            {store?.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={store.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              initialsOf(store?.name ?? me.name ?? 'Store')
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold text-[#111318]">{store?.name ?? 'Your store'}</span>
            <span className="flex items-center gap-1.5 text-[12px] text-[#7A7D86]">
              <span className={clsx('h-1.5 w-1.5 rounded-full', online ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]' : 'bg-slate-300')} />
              {status}
            </span>
          </span>
        </Link>
        <button
          type="button"
          aria-label="Account menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded-lg p-1.5 text-[#7A7D86] hover:bg-black/5 hover:text-[#111318]"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>
      {menuOpen && (
        <div className="absolute bottom-full left-3 right-3 mb-1 overflow-hidden rounded-[14px] border border-[#EFEFF1] bg-white py-1 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.25)]">
          <p className="truncate px-3.5 pb-1.5 pt-2 text-xs text-[#7A7D86]">Signed in as {me.name ?? 'Store owner'}</p>
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
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="block">
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
