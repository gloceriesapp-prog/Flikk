'use client';

// The signed-in owner's store, shared by the app shell (sidebar store card,
// header online switch) and any page that needs it, so there is one copy of
// the store and one place that flips it online/offline.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchMyStore, updateMyStore, type Store } from './partnerApi';
import type { Me } from './authApi';

interface StoreContextValue {
  me: Me;
  store: Store | null;
  setStore: (store: Store) => void;
  // Placed orders waiting for the owner, kept current by NewOrderAlert's poll.
  newOrderCount: number;
  setNewOrderCount: (count: number) => void;
  isTogglingOnline: boolean;
  setOnline: (online: boolean) => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ me, children }: { me: Me; children: ReactNode }) {
  const [store, setStoreState] = useState<Store | null>(null);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [isTogglingOnline, setIsTogglingOnline] = useState(false);

  useEffect(() => {
    fetchMyStore().then(setStoreState).catch(() => setStoreState(null));
  }, []);

  // Settings saves its own copy of the store and announces it with this event.
  useEffect(() => {
    function onStoreUpdated(e: Event) {
      setStoreState((e as CustomEvent<Store>).detail);
    }
    window.addEventListener('gloceries:store-updated', onStoreUpdated);
    return () => window.removeEventListener('gloceries:store-updated', onStoreUpdated);
  }, []);

  const setStore = useCallback((next: Store) => {
    setStoreState(next);
    window.dispatchEvent(new CustomEvent('gloceries:store-updated', { detail: next }));
  }, []);

  // Optimistic: the switch moves at once and snaps back if the server refuses
  // (for example a suspended store, which can never reopen from here).
  const setOnline = useCallback(
    async (online: boolean) => {
      if (!store || isTogglingOnline || store.admin_suspended) return;
      const previous = store;
      setIsTogglingOnline(true);
      setStoreState({ ...store, is_active: online });
      try {
        setStore(await updateMyStore({ is_active: online }));
      } catch {
        setStoreState(previous);
      } finally {
        setIsTogglingOnline(false);
      }
    },
    [store, isTogglingOnline, setStore],
  );

  const value = useMemo(
    () => ({ me, store, setStore, newOrderCount, setNewOrderCount, isTogglingOnline, setOnline }),
    [me, store, setStore, newOrderCount, isTogglingOnline, setOnline],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStoreContext(): StoreContextValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStoreContext must be used inside StoreProvider');
  return value;
}
