import { StoreTeamPanel } from '@/components/stores/StoreTeamPanel';
import { requireStoreAdmin } from '@/features/store-management/adminGate';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { STORE_SELECT, mapRowToStore, type StoreRow } from '@/lib/supabase/stores';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { StoreDetailForm } from '@/components/stores/StoreDetailForm';
import { StoreSuspensionPanel } from '@/components/stores/StoreSuspensionPanel';
import { StorePayoutPanel } from '@/components/stores/StorePayoutPanel';
import { STORE_PAYOUT_SELECT, toStorePayoutView } from '@/lib/storePayout';

export default async function StoreDetailPage({ params }: PageProps<'/stores/[id]'>) {
  if (await requireStoreAdmin()) notFound();
  const { id } = await params;
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) notFound();
  const { data, error } = await supabaseAdmin.from('stores').select(STORE_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  const store = mapRowToStore(data as unknown as StoreRow);
  const { data: payoutRow, error: payoutError } = await supabaseAdmin.from('stores').select(STORE_PAYOUT_SELECT).eq('id', id).maybeSingle();
  if (payoutError) throw payoutError;
  const payout = toStorePayoutView(payoutRow as Record<string, string | null> | null);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link href="/stores" className="flex w-fit items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
        <ArrowLeft size={15} />
        Back to Stores
      </Link>

      <StoreSuspensionPanel storeId={store.id} suspended={!!store.adminSuspended} reason={store.suspendedReason ?? null} suspendedAt={store.suspendedAt ?? null} />
      <StorePayoutPanel storeId={store.id} payout={payout} />
      <StoreTeamPanel storeId={store.id} />
      <StoreDetailForm key={`${store.id}:${store.adminSuspended ? 's' : 'a'}`} store={store} />
    </div>
  );
}
