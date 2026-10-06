import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../navigation/types';
import { getRefunds } from './api';
import { useCareList, uniqueRows } from './useCareQuery';
import { CareLayout, CareButton, CareEmpty, QueryNotice, displayDate } from './components/CareLayout';
import { REFUND_LABELS,refundReason } from './refundPresentation';
type Props = NativeStackScreenProps<AppStackParamList, 'MyRefunds'>;
export function RefundsScreen({ navigation }: Props) {
    const query = useCareList('refunds', getRefunds);
    const rows = uniqueRows(query.data?.pages);
    return <CareLayout title="My refunds" onBack={() => navigation.goBack()}>
  <View className="rounded-3xl bg-white p-5"><Text className="text-[22px] font-bold text-black">Your money, clearly tracked</Text><Text className="mt-2 text-sm text-gray-600">Refunds return to the payment method used for your order. Tap a refund for updates or help.</Text></View>
  <QueryNotice loading={query.isPending} error={query.error} hasData={!!query.data} retry={() => void query.refetch()}/>
  {rows.map(refund => <Pressable key={refund.id} onPress={() => navigation.navigate('RefundDetail', { kind: refund.kind, refundId: refund.target_id })} className="rounded-3xl bg-white p-5">
   <View className="flex-row items-center justify-between"><Text className="text-[24px] font-bold text-black">₹{Number(refund.amount).toFixed(2)}</Text><Text className="text-xs font-bold" style={{ color: refund.status === 'failed' ? '#B42318' : refund.status === 'completed' ? '#187B49' : '#155DFC' }}>{REFUND_LABELS[refund.status]}</Text></View>
   <Text className="mt-3 text-sm font-semibold text-black">{refund.reference}</Text><Text className="mt-1 text-sm text-gray-500">{refundReason(refund.reason)}</Text><Text className="mt-3 text-xs text-gray-500">Order placed · {displayDate(refund.order_placed_at)}</Text>
  </Pressable>)}
  {!query.isPending && !query.error && !rows.length ? <CareEmpty text="No refunds yet. If a payment or order needs attention, you can raise a support request."/> : null}
  {query.hasNextPage ? <CareButton label="More refunds" onPress={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}/> : null}
  <CareButton label="Get help with a payment" onPress={() => navigation.navigate('Support', { category: 'payment' })}/>
 </CareLayout>;
}
