'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchMyStore, type Store } from '@/lib/partnerApi';
import { StoreProfileForm } from '@/components/settings/StoreProfileForm';
import { StoreHoursForm } from '@/components/settings/StoreHoursForm';
import { PayoutVerificationForm } from '@/components/settings/PayoutVerificationForm';

export default function SettingsPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(() => fetchMyStore().then(setStore), []);

  useEffect(() => {
    reload().finally(() => setIsLoading(false));
  }, [reload]);

  function handleStoreSaved(updated: Store) {
    setStore(updated);
  }

  if (isLoading || !store) {
    return <div className="rounded-2xl border border-neutral-200 bg-white py-20 text-center text-sm text-neutral-400">Loading settings…</div>;
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-black">Settings</h1>
        <p className="mt-1 text-sm text-neutral-400">Store profile, hours, and where your payouts land.</p>
      </div>

      <StoreProfileForm store={store} onSaved={handleStoreSaved} />
      <StoreHoursForm store={store} onSaved={handleStoreSaved} />
      <PayoutVerificationForm store={store} onVerified={reload} />
    </div>
  );
}
