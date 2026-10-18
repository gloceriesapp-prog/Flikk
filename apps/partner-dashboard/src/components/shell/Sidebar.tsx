'use client';

// Left navigation for every dashboard page: brand, the grouped menu and the
// store / owner footer. On large screens it is a full-height panel that folds
// to an icon rail (the choice is remembered); hovering a rail icon shows its
// label. Below lg it becomes a slide-in drawer opened from the header.

import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import { ChevronDown, LogOut, MoreHorizontal, X } from 'lucide-react';
import { clearTokens } from '@/lib/authStorage';
import { useStoreContext } from '@/lib/storeContext';
import { NAV_SECTIONS, isActivePath, type NavChild, type NavItem } from './nav';

const COLLAPSED_KEY = 'gloceries_partner_sidebar_collapsed';

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'G';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  // The shell only renders after the client-side session check, so reading
  // storage in the initializer cannot cause a hydration mismatch.
  const [collapsedPref, setCollapsedPref] = useState(readCollapsed);
  // The mobile drawer is always shown in full.
  const collapsed = collapsedPref && !open;

  function toggleCollapsed() {
    setCollapsedPref((value) => {
      try {
        window.localStorage.setItem(COLLAPSED_KEY, value ? '0' : '1');
      } catch {
        // Storage blocked: the choice just lasts for this visit.
      }
      return !value;
    });
  }

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
          'fixed inset-y-0 left-0 z-50 flex h-full shrink-0 flex-col border-r border-[#EAEAEC] bg-white transition-[width,transform] duration-200 ease-out lg:static lg:z-auto lg:translate-x-0',
          collapsed ? 'w-[76px]' : 'w-[272px] lg:w-[260px]',
          open ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
        )}
      >
        <Header collapsed={collapsed} onToggle={toggleCollapsed} onClose={onClose} />

        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-3 pb-3">
          {NAV_SECTIONS.map((section, index) => (
            <div key={section.title ?? index} className={clsx('border-t border-[#EFEFF1] pb-3', collapsed ? 'pt-3' : 'pt-4')}>
              {section.title && !collapsed && (
                <p className="mb-2 whitespace-nowrap px-3 text-[11.5px] font-medium uppercase tracking-[0.08em] text-[#9A9DA6]">{section.title}</p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) =>
                  item.children ? (
                    // useSearchParams needs a Suspense boundary for prerendering.
                    <Suspense
                      key={item.href}
                      fallback={<NavLink item={item} active={isActivePath(pathname, item.href)} collapsed={collapsed} />}
                    >
                      <NavGroup item={item} pathname={pathname} collapsed={collapsed} />
                    </Suspense>
                  ) : (
                    <NavLink key={item.href} item={item} active={isActivePath(pathname, item.href)} collapsed={collapsed} />
                  ),
                )}
              </ul>
            </div>
          ))}
        </nav>

        <AccountFooter collapsed={collapsed} />
      </aside>
    </>
  );
}

function Header({ collapsed, onToggle, onClose }: { collapsed: boolean; onToggle: () => void; onClose: () => void }) {
  const toggle = (
    <button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[#3A3D45] transition-colors hover:bg-[#F2F2F4] hover:text-[#111318] lg:flex"
    >
      <MenuCloseIcon flipped={collapsed} />
    </button>
  );

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-3 pb-4 pt-5">
        <Link href="/" aria-label="Gloceries Partner home" className="rounded-[11px] shadow-[0_6px_14px_-6px_rgba(21,93,252,0.65)]">
          <BrandMark size={34} />
        </Link>
        {toggle}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-5 pl-5 pr-3">
      <Link href="/" className="group flex min-w-0 flex-1 items-center gap-3">
        <span className="shrink-0 rounded-[11px] shadow-[0_6px_14px_-6px_rgba(21,93,252,0.65)] transition-transform group-hover:scale-[1.04]">
          <BrandMark size={32} />
        </span>
        <span className="truncate whitespace-nowrap text-[17px] font-semibold tracking-[-0.02em] text-[#111318]">Gloceries Partner</span>
      </Link>
      {toggle}
      <button type="button" onClick={onClose} aria-label="Close menu" className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden">
        <X size={18} />
      </button>
    </div>
  );
}

const ROW = 'flex items-center rounded-[12px] text-[15px] transition-colors';
const ROW_ACTIVE = 'bg-[#EEEFF1] font-semibold text-[#111318] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.03)]';
const ROW_IDLE = 'font-medium text-[#2A2D34] hover:bg-[#F6F6F7] hover:text-[#111318]';

function NavLink({
  item,
  active,
  collapsed,
  trailing,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  trailing?: ReactNode;
}) {
  const { newOrderCount } = useStoreContext();
  const Icon = item.icon;
  const badge = item.href === '/orders' && newOrderCount > 0 ? newOrderCount : 0;
  const badgeText = badge > 99 ? '99+' : String(badge);

  if (collapsed) {
    return (
      <li>
        <HoverLabel label={item.label}>
          <Link
            href={item.href}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            className={clsx(ROW, 'relative mx-auto h-11 w-11 justify-center', active ? ROW_ACTIVE : ROW_IDLE)}
          >
            <Icon size={20} strokeWidth={active ? 2.2 : 1.7} />
            {badge > 0 && (
              <span className="tnum absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[#E5484D] px-1 text-center text-[10px] font-semibold leading-[18px] text-white ring-2 ring-white">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </Link>
        </HoverLabel>
      </li>
    );
  }

  return (
    <li className="relative">
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={clsx(ROW, 'gap-3 px-3 py-2.5', active ? ROW_ACTIVE : ROW_IDLE)}
      >
        <Icon size={19} strokeWidth={active ? 2.2 : 1.7} className={active ? 'text-[#111318]' : 'text-[#3A3D45]'} />
        <span className="flex-1 truncate whitespace-nowrap">{item.label}</span>
        {badge > 0 && (
          <span className="tnum rounded-full bg-[#E5484D] px-2 text-[11px] font-semibold leading-5 text-white shadow-[0_4px_10px_-4px_rgba(229,72,77,0.7)]">
            {badgeText}
          </span>
        )}
        {trailing && <span className="w-5" />}
      </Link>
      {trailing}
    </li>
  );
}

// An item with a sub-menu: the item itself (active only when no sub-filter is
// chosen), a chevron to fold it and a branch tree of dotted children. On the
// icon rail the children appear in the hover card instead.
function NavGroup({ item, pathname, collapsed }: { item: NavItem; pathname: string; collapsed: boolean }) {
  const searchParams = useSearchParams();
  const [expanded, setExpanded] = useState(true);
  const children = item.children ?? [];
  const onSection = isActivePath(pathname, item.href);
  const activeChild = onSection ? children.find((child) => isChildActive(child, searchParams)) : undefined;

  if (collapsed) {
    const Icon = item.icon;
    return (
      <li>
        <HoverLabel
          label={item.label}
          content={
            <div className="min-w-[200px] py-1">
              <Link href={item.href} className="block px-3 py-1.5 text-[13.5px] font-semibold text-[#111318] hover:bg-[#F6F6F7]">
                {item.label}
              </Link>
              {children.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  className={clsx(
                    'flex items-center gap-2.5 px-3 py-1.5 text-[13.5px] hover:bg-[#F6F6F7]',
                    child === activeChild ? 'font-semibold text-[#111318]' : 'font-medium text-[#2A2D34]',
                  )}
                >
                  <span className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', child.dot)} />
                  {child.label}
                </Link>
              ))}
            </div>
          }
        >
          <Link
            href={item.href}
            aria-label={item.label}
            aria-current={onSection ? 'page' : undefined}
            className={clsx(ROW, 'mx-auto h-11 w-11 justify-center', onSection ? ROW_ACTIVE : ROW_IDLE)}
          >
            <Icon size={20} strokeWidth={onSection ? 2.2 : 1.7} />
          </Link>
        </HoverLabel>
      </li>
    );
  }

  return (
    <>
      <NavLink
        item={item}
        active={onSection && !activeChild}
        collapsed={false}
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
                      'flex items-center gap-2.5 whitespace-nowrap rounded-[10px] px-2.5 py-2 text-[14.5px] transition-colors',
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

// Label (or a small menu) beside a rail icon while it is hovered or focused.
// Fixed-positioned from the icon's box, because the scrolling nav would clip
// anything that sticks out of it. A short close delay lets the pointer cross
// into an interactive card.
function HoverLabel({ label, content, children }: { label: string; content?: ReactNode; children: ReactNode }) {
  const anchor = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  function show() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    const box = anchor.current?.getBoundingClientRect();
    if (box) setPos({ top: box.top + box.height / 2, left: box.right + 10 });
  }
  function hide() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setPos(null), content ? 120 : 0);
  }

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  return (
    <div ref={anchor} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {pos && (
        <div
          role={content ? 'menu' : 'tooltip'}
          onMouseEnter={show}
          onMouseLeave={hide}
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-[60] -translate-y-1/2 animate-[toast-in_120ms_ease-out]"
        >
          {/* Invisible bridge so the pointer can travel from icon to card. */}
          <span aria-hidden="true" className="absolute -left-3 inset-y-0 w-3" />
          {content ? (
            <div className="overflow-hidden rounded-[12px] border border-[#EAEAEC] bg-white shadow-[0_12px_32px_-12px_rgba(15,23,42,0.28)]">{content}</div>
          ) : (
            <span className="block whitespace-nowrap rounded-[8px] bg-[#111318] px-2.5 py-1.5 text-[12.5px] font-medium text-white shadow-[0_8px_20px_-8px_rgba(15,23,42,0.5)]">
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// The store being managed, its live status and the owner's account menu.
function AccountFooter({ collapsed }: { collapsed: boolean }) {
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

  const avatar = (
    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#111318] text-sm font-semibold text-white">
      {store?.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={store.photo_url} alt="" className="h-full w-full object-cover" />
      ) : (
        initialsOf(store?.name ?? me.name ?? 'Store')
      )}
    </span>
  );

  return (
    <div ref={ref} className="relative border-t border-[#EFEFF1] p-3">
      {collapsed ? (
        <button
          type="button"
          aria-label="Account menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="relative mx-auto block rounded-full transition-transform hover:scale-[1.04]"
        >
          {avatar}
          <span
            className={clsx(
              'absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-white',
              online ? 'bg-emerald-500' : 'bg-slate-300',
            )}
          />
        </button>
      ) : (
        <div className="flex items-center gap-3 rounded-[14px] p-2 transition-colors hover:bg-[#F6F6F7]">
          <Link href="/settings" className="flex min-w-0 flex-1 items-center gap-3">
            {avatar}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold text-[#111318]">{store?.name ?? 'Your store'}</span>
              <span className="flex items-center gap-1.5 whitespace-nowrap text-[12px] text-[#7A7D86]">
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
      )}
      {menuOpen && (
        <div
          className={clsx(
            'absolute bottom-full z-[60] mb-1 overflow-hidden rounded-[14px] border border-[#EFEFF1] bg-white py-1 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.25)]',
            collapsed ? 'left-3 w-[220px]' : 'left-3 right-3',
          )}
        >
          {collapsed && <p className="truncate px-3.5 pt-2 text-[13.5px] font-semibold text-[#111318]">{store?.name ?? 'Your store'}</p>}
          <p className="truncate px-3.5 pb-1.5 pt-1 text-xs text-[#7A7D86]">Signed in as {me.name ?? 'Store owner'}</p>
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

// "Menu close left": arrow out of a list. Mirrored, it reads as "open".
function MenuCloseIcon({ flipped }: { flipped: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={clsx('transition-transform duration-200', flipped && '-scale-x-100')}
    >
      <path d="M7 16L3 11.9994M3 11.9994L7 8M3 11.9994L21 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path opacity="0.4" d="M12 5H21M12 19H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
