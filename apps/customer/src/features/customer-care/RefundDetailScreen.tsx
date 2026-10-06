import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../navigation/types';
import { getRefund, type RefundUpdate } from './api';
import { useCareDetail } from './useCareQuery';
import { CareLayout, CareButton, QueryNotice, displayDate } from './components/CareLayout';
import { REFUND_LABELS, refundReason } from './refundPresentation';
type Props = NativeStackScreenProps<AppStackParamList, 'RefundDetail'>;
function RefundDetails({ navigation, route }: Props) {
    const { kind, refundId } = route.params;
    const query = useCareDetail(`refund:${kind}:${refundId}`, () => getRefund(kind, refundId));
    const [older, setOlder] = useState<RefundUpdate[]>([]);
    const [offset, setOffset] = useState(0);
    const [more, setMore] = useState(true);
    const [busy, setBusy] = useState(false);
    const refund = query.data?.refund;
    const updates = [...new Map([...(query.data?.updates ?? []), ...older].map(update => [update.id, update])).values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
    async function loadOlder() {
        if (busy)
            return;
        setBusy(true);
        try {
            const page = await getRefund(kind, refundId, offset + 25);
            setOlder(current => [...current, ...page.updates]);
            setOffset(offset + 25);
            setMore(page.updates.length === 25);
        }
        catch (error) {
            Alert.alert('Could not load updates', error instanceof Error ? error.message : 'Please retry.');
        }
        finally {
            setBusy(false);
        }
    }
    return <CareLayout title="Refund details" onBack={() => navigation.goBack()}>
  <QueryNotice loading={query.isPending} error={query.error} hasData={!!query.data} retry={() => void query.refetch()}/>
  {refund ? <>
   <View className="rounded-3xl bg-white p-6"><Text className="text-[32px] font-bold text-black">₹{Number(refund.amount).toFixed(2)}</Text><Text className="mt-2 text-base font-bold text-[#155DFC]">{REFUND_LABELS[refund.status]}</Text><Text className="mt-4 text-sm text-gray-600">{refundReason(refund.reason)}</Text></View>
   <View className="gap-2 rounded-3xl bg-white p-5"><Text className="font-bold text-black">Where your refund goes</Text><Text className="text-sm text-gray-600">{refund.destination}</Text><Text className="mt-2 font-bold text-black">Linked order</Text><Text className="text-sm text-gray-600">{refund.reference}</Text><Text className="text-xs text-gray-500">Placed {displayDate(refund.order_placed_at)}</Text>{refund.updated_at ? <Text className="text-xs text-gray-500">Last recorded update {displayDate(refund.updated_at)}</Text> : null}</View>
   <CareButton label="View order summary" onPress={() => navigation.navigate('OrderSummary', { orderId: refund.target_id, isTrip: refund.kind === 'trip' })}/>
   <Text className="text-lg font-bold text-black">Refund updates</Text>
   {updates.map(update => <View key={update.id} className="rounded-2xl bg-white p-4"><Text className="font-bold text-black">{REFUND_LABELS[update.status as keyof typeof REFUND_LABELS] ?? update.status}</Text><Text className="mt-1 text-xs text-gray-500">{displayDate(update.created_at)}</Text></View>)}
   {!updates.length ? <Text className="text-sm text-gray-500">Your current refund status is shown above. Earlier updates were not recorded.</Text> : null}
   {more && (query.data?.updates.length ?? 0) >= 25 ? <CareButton label="Earlier updates" onPress={() => void loadOlder()} disabled={busy}/> : null}
   <CareButton label="Get help with this refund" onPress={() => navigation.navigate('Support', { target: { orderId: refund.target_id, isTrip: refund.kind === 'trip' }, category: 'payment' })}/>
  </> : null}
 </CareLayout>;
}

export function RefundDetailScreen(props:Props){return <RefundDetails key={`${props.route.params.kind}:${props.route.params.refundId}`} {...props} />;}
