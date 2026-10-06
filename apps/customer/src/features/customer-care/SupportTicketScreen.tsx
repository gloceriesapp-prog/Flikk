import { ApiError } from '../../api/client';
import { useRef, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../navigation/types';
import { getThread, replyTicket, requestId, ISSUE_LABELS, type Message } from './api';
import { useCareDetail } from './useCareQuery';
import { CareLayout, CareButton, QueryNotice, displayDate } from './components/CareLayout';
type Props = NativeStackScreenProps<AppStackParamList, 'SupportTicket'>;
function SupportConversation({ navigation, route }: Props) {
    const id = route.params.ticketId;
    const retainedMessages = useRef(new Map<string, Message>());
    const query = useCareDetail(`ticket:${id}`, async () => {
        const page = await getThread(id);
        for (const row of page.messages) retainedMessages.current.set(row.id, row);
        return { ...page, messages: [...retainedMessages.current.values()] };
    });
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const [uncertain, setUncertain] = useState(false);
    const [older, setOlder] = useState<Message[]>([]);
    const [offset, setOffset] = useState(0);
    const [more, setMore] = useState(true);
    const attempt = useRef<{
        request_id: string;
        message: string;
    } | null>(null);
    const lock = useRef(false);
    const rows = [...new Map([...(query.data?.messages ?? []), ...older].map(m => [m.id, m])).values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
    async function send() {
        if (lock.current)
            return;
        lock.current = true;
        setBusy(true);
        try {
            attempt.current ??= { request_id: (await requestId()).id, message: text.trim() };
            await replyTicket(id, attempt.current);
            attempt.current = null;
            setUncertain(false);
            setText('');
            await query.refetch();
        }
        catch (error) {
            const unknown = !(error instanceof ApiError) || error.status === 0 || error.status >= 500 || error.status === 408;
            if (!unknown)
                attempt.current = null;
            setUncertain(unknown && !!attempt.current);
            Alert.alert('Message not confirmed', error instanceof Error ? error.message : 'Retry safely.');
        }
        finally {
            lock.current = false;
            setBusy(false);
        }
    }
    async function loadOlder() {
        if (lock.current)
            return;
        lock.current = true;
        setBusy(true);
        try {
            const page = await getThread(id, offset + 25);
            setOlder(current => [...current, ...page.messages]);
            setOffset(offset + 25);
            setMore(page.messages.length === 25);
        }
        catch (error) {
            Alert.alert('Could not load messages', error instanceof Error ? error.message : 'Please retry.');
        }
        finally {
            lock.current = false;
            setBusy(false);
        }
    }
    const ticket = query.data?.ticket;
    return <CareLayout title="Support conversation" onBack={() => navigation.goBack()}>
  <QueryNotice loading={query.isPending} error={query.error} hasData={!!query.data} retry={() => void query.refetch()}/>
  {ticket ? <>
   <View className="rounded-3xl bg-white p-5"><Text className="text-lg font-bold text-black">{ISSUE_LABELS[ticket.category]}</Text><Text className="mt-1 text-sm text-gray-600">{ticket.status.replace(/_/g, ' ')} · Case {ticket.id.slice(0, 8).toUpperCase()}</Text>{ticket.order_id || ticket.trip_id ? <CareButton label="View linked order" onPress={() => navigation.navigate('OrderSummary', { orderId: (ticket.trip_id ?? ticket.order_id)!, isTrip: !!ticket.trip_id })}/> : null}</View>
   {more && (query.data?.messages.length ?? 0) >= 25 ? <CareButton label="Earlier messages" disabled={busy} onPress={() => void loadOlder()}/> : null}
   {rows.map(msg => <View key={msg.id} className="rounded-2xl p-4" style={{ backgroundColor: msg.actor_role === 'admin' ? '#EAF2FF' : '#FFFFFF' }}><Text className="text-xs font-bold text-gray-500">{msg.actor_role === 'admin' ? 'Support team' : 'You'} · {displayDate(msg.created_at)}</Text><Text className="mt-2 text-[15px] leading-6 text-black">{msg.body}</Text></View>)}
   <TextInput accessibilityLabel="Message support" value={text} onChangeText={setText} editable={!busy && !uncertain} multiline maxLength={2000} placeholder={ticket.status === 'resolved' ? 'Need more help? A reply reopens this case.' : 'Add more details…'} className="min-h-[100px] rounded-2xl bg-white p-4 text-[15px] text-black"/>
   <CareButton label={busy ? 'Sending…' : uncertain ? 'Retry message' : 'Send message'} onPress={() => void send()} disabled={busy || !text.trim()}/>
  </> : null}
 </CareLayout>;
}

export function SupportTicketScreen(props:Props){return <SupportConversation key={props.route.params.ticketId} {...props} />;}
