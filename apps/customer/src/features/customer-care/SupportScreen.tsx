import { ApiError } from '../../api/client';
import { useRef, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../navigation/types';
import { createTicket, getTickets, getSupportOrders, requestId, ISSUE_LABELS, type IssueCategory, type SupportTarget } from './api';
import { useCareList, uniqueRows } from './useCareQuery';
import { CareLayout, CareButton, CareEmpty, QueryNotice, displayDate } from './components/CareLayout';
type Props = NativeStackScreenProps<AppStackParamList, 'Support'>;
function SupportForm({ navigation, route }: Props) {
    const tickets = useCareList('tickets', getTickets);
    const orders = useCareList('support-orders', getSupportOrders);
    const [target, setTarget] = useState<SupportTarget | undefined>(route.params?.target);
    const [category, setCategory] = useState<IssueCategory>(route.params?.category ?? 'missing_items');
    const [details, setDetails] = useState('');
    const [busy, setBusy] = useState(false);
    const attempt = useRef<Parameters<typeof createTicket>[0] | null>(null);
    const lock = useRef(false);
    const [uncertain, setUncertain] = useState(false);
    const rows = uniqueRows(orders.data?.pages);
    const ticketRows = uniqueRows(tickets.data?.pages);
    const seen = new Set<string>();
    const choices = rows.filter(order => { const id = order.trip_id ?? order.id; if (seen.has(id))
        return false; seen.add(id); return true; });
    async function submit() {
        if (lock.current)
            return;
        lock.current = true;
        setBusy(true);
        try {
            if (!attempt.current)
                attempt.current = { request_id: (await requestId()).id, category, message: details.trim(), ...(target ? target.isTrip ? { trip_id: target.orderId } : { order_id: target.orderId } : {}) };
            const saved = await createTicket(attempt.current);
            attempt.current = null;
            setUncertain(false);
            setDetails('');
            void tickets.refetch();
            navigation.navigate('SupportTicket', { ticketId: saved.id });
        }
        catch (error) {
            const unknown = !(error instanceof ApiError) || error.status === 0 || error.status >= 500 || error.status === 408;
            if (!unknown)
                attempt.current = null;
            setUncertain(unknown && !!attempt.current);
            Alert.alert('Request not confirmed', error instanceof Error ? error.message : 'Retry to check whether your ticket was saved.');
        }
        finally {
            lock.current = false;
            setBusy(false);
        }
    }
    return <CareLayout title="Help & support" onBack={() => navigation.goBack()}>
  <View className="rounded-3xl bg-white p-5"><Text className="text-[22px] font-bold text-black">Let’s sort it out</Text><Text className="mt-2 text-sm text-gray-600">Choose an order and tell us what happened. Replies appear in your support conversation.</Text></View>
  <Text className="text-lg font-bold text-black">Which order?</Text>
  {target ? <View className="rounded-2xl bg-white p-4"><Text className="text-sm font-semibold text-black">{target.isTrip ? 'Multi-shop order' : choices.find(o => o.id === target.orderId)?.order_number ?? 'Selected order'}</Text><Pressable disabled={busy || uncertain} onPress={() => setTarget(undefined)}><Text className="mt-2 text-sm font-semibold text-[#155DFC]">Choose another order</Text></Pressable></View> : <>
   <QueryNotice loading={orders.isPending} error={orders.error} hasData={!!orders.data} retry={() => void orders.refetch()}/>
   {choices.map(order => <Pressable key={order.id} disabled={busy || uncertain} onPress={() => setTarget({ orderId: order.trip_id ?? order.id, isTrip: !!order.trip_id })} className="rounded-2xl bg-white p-4"><Text className="font-bold text-black">{order.trip_id ? 'Multi-shop order' : order.order_number} · {order.status.replace(/_/g, ' ')}</Text><Text className="mt-1 text-xs text-gray-500">{order.stores?.name} · {displayDate(order.placed_at)}</Text></Pressable>)}
   {orders.hasNextPage ? <CareButton label="More orders" onPress={() => void orders.fetchNextPage()} disabled={orders.isFetchingNextPage}/> : null}
  </>}
  <Text className="text-lg font-bold text-black">What needs attention?</Text>
  <View className="flex-row flex-wrap gap-2">{(Object.keys(ISSUE_LABELS) as IssueCategory[]).map(key => <Pressable key={key} disabled={busy || uncertain} onPress={() => setCategory(key)} className="rounded-2xl border px-3 py-3" style={{ borderColor: category === key ? '#155DFC' : '#E5E7EB', backgroundColor: category === key ? '#EFF5FF' : 'white' }}><Text className="text-sm font-semibold text-black">{ISSUE_LABELS[key]}</Text></Pressable>)}</View>
  <TextInput accessibilityLabel="Describe your issue" editable={!busy && !uncertain} value={details} onChangeText={setDetails} multiline maxLength={2000} placeholder="Tell us which items are affected and what happened…" textAlignVertical="top" className="min-h-[120px] rounded-2xl bg-white p-4 text-[15px] text-black"/>
  {uncertain ? <Text className="text-xs text-gray-600">Retry uses the same request to avoid duplicate tickets. Check your conversations below for an existing case.</Text> : null}
  <CareButton label={busy ? 'Sending…' : uncertain ? 'Retry request' : 'Send support request'} onPress={() => void submit()} disabled={busy || details.trim().length < 10 || (!target && category !== 'general')}/>
  <Text className="text-lg font-bold text-black">Your conversations</Text>
  <QueryNotice loading={tickets.isPending} error={tickets.error} hasData={!!tickets.data} retry={() => void tickets.refetch()}/>
  {ticketRows.map(ticket => <Pressable key={ticket.id} onPress={() => navigation.navigate('SupportTicket', { ticketId: ticket.id })} className="rounded-2xl bg-white p-4"><Text className="font-bold text-black">{ISSUE_LABELS[ticket.category]}</Text><Text className="mt-1 text-sm text-gray-600">{ticket.status.replace(/_/g, ' ')} · {displayDate(ticket.updated_at)}</Text></Pressable>)}
  {!tickets.isPending && !tickets.error && !ticketRows.length ? <CareEmpty text="No support conversations yet. You can also choose Something else for a question without an order."/> : null}
  {tickets.hasNextPage ? <CareButton label="More conversations" onPress={() => void tickets.fetchNextPage()} disabled={tickets.isFetchingNextPage}/> : null}
 </CareLayout>;
}

export function SupportScreen(props:Props){return <SupportForm key={`${props.route.params?.target?.orderId ?? 'general'}:${props.route.params?.category ?? 'choose'}`} {...props} />;}
