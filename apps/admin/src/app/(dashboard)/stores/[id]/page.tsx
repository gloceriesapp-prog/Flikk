import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { STORE_SELECT, mapRowToStore, type StoreRow } from '@/lib/supabase/stores';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { StoreDetailForm } from '@/components/stores/StoreDetailForm';
import { StoreSuspensionPanel } from '@/components/stores/StoreSuspensionPanel';
import { StorePayoutPanel } from '@/components/stores/StorePayoutPanel';
import { StoreCommissionPanel } from '@/components/stores/StoreCommissionPanel';
import { StoreChangeRequests } from '@/components/stores/StoreChangeRequests';
import { PartnerAccountPanel, type PartnerAccountAction } from '@/components/stores/PartnerAccountPanel';
import { STORE_PAYOUT_SELECT, toStorePayoutView } from '@/lib/storePayout';

export default async function StoreDetailPage({ params }: PageProps<'/stores/[id]'>) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) notFound();
  const { data, error } = await supabaseAdmin.from('stores').select(STORE_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  const store = mapRowToStore(data as unknown as StoreRow);
  const { data: payoutRow, error: payoutError } = await supabaseAdmin.from('stores').select(STORE_PAYOUT_SELECT).eq('id', id).maybeSingle();
  if (payoutError) throw payoutError;
  const payout = toStorePayoutView(payoutRow as Record<string, string | null> | null);
  // Commission override (migration 115) next to the platform default it replaces.
  const [{ data: commissionRow, error: commissionError }, { data: platformRow }] = await Promise.all([
    supabaseAdmin.from('stores').select('commission_rate').eq('id', id).maybeSingle(),
    supabaseAdmin.from('platform_settings').select('commission_rate').limit(1).maybeSingle(),
  ]);
  if (commissionError) throw commissionError;
  const storeRate = (commissionRow as { commission_rate: number | string | null } | null)?.commission_rate;
  const platformRate = (platformRow as { commission_rate: number | string | null } | null)?.commission_rate;
  // Partner account (migration 114): the owner's suspension state and the
  // audit trail of suspend/reinstate actions.
  const { data: ownerRef } = await supabaseAdmin.from('stores').select('owner_user_id').eq('id', id).maybeSingle();
  const ownerId = (ownerRef as { owner_user_id: string } | null)?.owner_user_id ?? null;
  const [{ data: owner }, { data: actions }] = ownerId
    ? await Promise.all([
        supabaseAdmin.from('users').select('name, phone, partner_suspended, partner_suspended_reason, partner_suspended_at').eq('id', ownerId).maybeSingle(),
        supabaseAdmin.from('partner_account_actions').select('id, action, reason, created_at').eq('user_id', ownerId).order('created_at', { ascending: false }).limit(10),
      ])
    : [{ data: null }, { data: null }];
  const ownerRow = owner as { name: string | null; phone: string | null; partner_suspended: boolean; partner_suspended_reason: string | null; partner_suspended_at: string | null } | null;
  const history: PartnerAccountAction[] = ((actions ?? []) as { id: string; action: 'suspend' | 'reinstate'; reason: string | null; created_at: string }[])
    .map((a) => ({ id: a.id, action: a.action, reason: a.reason, createdAt: a.created_at }));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link href="/stores" className="flex w-fit items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
        <ArrowLeft size={15} />
        Back to Stores
      </Link>

      {ownerRow && (
        <PartnerAccountPanel
          storeId={store.id}
          ownerLabel={[ownerRow.name, ownerRow.phone].filter(Boolean).join(' · ') || 'Store owner'}
          suspended={ownerRow.partner_suspended === true}
          reason={ownerRow.partner_suspended_reason}
          suspendedAt={ownerRow.partner_suspended_at}
          history={history}
        />
      )}
      <StoreSuspensionPanel storeId={store.id} suspended={!!store.adminSuspended} reason={store.suspendedReason ?? null} suspendedAt={store.suspendedAt ?? null} />
      <StoreChangeRequests storeId={store.id} />
      <StorePayoutPanel storeId={store.id} payout={payout} />
      <StoreCommissionPanel
        key={`commission:${storeRate ?? 'default'}`}
        storeId={store.id}
        storeRate={storeRate == null ? null : Number(storeRate)}
        platformRate={platformRate == null ? null : Number(platformRate)}
      />
      <StoreDetailForm key={`${store.id}:${store.adminSuspended ? 's' : 'a'}:${store.name}:${store.category}:${store.lat}:${store.lng}:${store.addressLine}`} store={store} />
    </div>
  );
}
