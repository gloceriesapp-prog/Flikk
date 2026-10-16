'use client';

import { useCallback, useState } from 'react';
import { Sidebar } from '@/components/shell/Sidebar';
import { AppHeader } from '@/components/shell/AppHeader';
import { NewOrderAlert } from '@/components/NewOrderAlert';
import { Toaster } from '@/components/ui/Toast';
import { useSession } from '@/lib/useSession';
import { StoreProvider, useStoreContext } from '@/lib/storeContext';

export default function DashboardLayout({ children }: LayoutProps<'/'>) {
  const { me, isLoading } = useSession();

  if (isLoading || !me) {
    return <div className="flex min-h-screen items-center justify-center bg-canvas" />;
  }

  return (
    <StoreProvider me={me}>
      <Shell>{children}</Shell>
    </StoreProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const { setNewOrderCount } = useStoreContext();

  return (
    <div className="flex h-screen overflow-hidden bg-canvas text-ink">
      <Sidebar open={menuOpen} onClose={closeMenu} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 lg:p-3 lg:pl-4">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4">
            <AppHeader onOpenMenu={() => setMenuOpen(true)} />
            {children}
          </div>
        </main>
      </div>
      <NewOrderAlert onCountChange={setNewOrderCount} />
      <Toaster />
    </div>
  );
}
