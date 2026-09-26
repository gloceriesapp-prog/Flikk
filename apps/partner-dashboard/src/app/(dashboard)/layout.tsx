'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { TopHeader } from '@/components/TopHeader';
import { NewOrderAlert } from '@/components/NewOrderAlert';
import { Toaster } from '@/components/ui/Toast';
import { useSession } from '@/lib/useSession';
import { fetchMyStore, type Store } from '@/lib/partnerApi';

// Deterministic per-user placeholder avatar (DiceBear, seeded by phone so
// it's stable across reloads for the same owner) — a real photo-upload
// flow doesn't exist for store owners yet, this is explicitly a stand-in.
function avatarUrlFor(seed: string): string {
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}`;
}

export default function DashboardLayout({ children }: LayoutProps<'/'>) {
  const { me, isLoading } = useSession();
  const [store, setStore] = useState<Store | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (!me) return;
    fetchMyStore().then(setStore).catch(() => setStore(null));
    // Live 'placed' count is driven by <NewOrderAlert> below (it polls anyway),
    // so there's no separate orders fetch here.
  }, [me]);

  // Settings (and now the Overview page's own online/offline toggle) each
  // save their own copy of the store and have no other way to reach this
  // layout's copy — without this, the Sidebar's store name/status would
  // only catch up on a full page reload.
  useEffect(() => {
    function onStoreUpdated(e: Event) {
      setStore((e as CustomEvent<Store>).detail);
    }
    window.addEventListener('flikk:store-updated', onStoreUpdated);
    return () => window.removeEventListener('flikk:store-updated', onStoreUpdated);
  }, []);

  if (isLoading || !me) {
    return <div className="flex min-h-screen items-center justify-center bg-white" />;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-50">
      <div className="flex min-h-0 flex-1">
        <Sidebar storeName={store?.name ?? 'Your store'} ordersNeedingActionCount={notificationCount} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Content panel — rounded, bordered, inset from the sidebar/edges so
              it reads as a premium surface floating on the neutral-50 app bg. */}
          <div className="m-1.5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-hairline bg-white lg:m-2">
            <TopHeader notificationCount={notificationCount} ownerName={me.name ?? 'Store owner'} avatarUrl={avatarUrlFor(me.phone)} />
            <main className="flex-1 overflow-y-auto px-5 py-5 lg:px-7 lg:py-6">
              <div className="mx-auto w-full max-w-[1400px]">{children}</div>
            </main>
          </div>
        </div>
      </div>
      <NewOrderAlert onCountChange={setNotificationCount} />
      <Toaster />
    </div>
  );
}
