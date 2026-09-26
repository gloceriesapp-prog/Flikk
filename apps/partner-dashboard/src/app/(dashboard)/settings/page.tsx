'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchMyStore, type Store } from '@/lib/partnerApi';
import { StoreProfileForm } from '@/components/settings/StoreProfileForm';
import { StoreHoursForm } from '@/components/settings/StoreHoursForm';
import { KycForm } from '@/components/settings/KycForm';
import { PayoutVerificationForm } from '@/components/settings/PayoutVerificationForm';
import { Card } from '@/components/ui/Card';

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
    return <Card className="py-20 text-center text-sm text-neutral-400">Loading settings…</Card>;
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <StoreProfileForm store={store} onSaved={handleStoreSaved} />
      <StoreHoursForm store={store} onSaved={handleStoreSaved} />
      <KycForm store={store} onSaved={handleStoreSaved} />
      <PayoutVerificationForm store={store} onVerified={reload} />
    </div>
  );
}
