// One support request: the conversation with the support team (admin Support
// inbox) and a reply box. Replying to a resolved request reopens it. Refreshes
// every 15 s while open. Same screen in apps/rider.

import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { SUPPORT_STATUS_LABEL, newRequestId, supportCategoryLabel, validateSupportMessage } from '@gloceries/shared';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { supportApi } from '../../api/support';
import { useSupportThread } from './useSupport';
import type { AppStackParamList } from '../../navigation/types';

const CARD_BORDER = '#EAECEE';

function stamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getDate()}/${d.getMonth() + 1} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SupportTicketScreen() {
  const navigation = useNavigation();
  const { ticketId } = useRoute<RouteProp<AppStackParamList, 'SupportTicket'>>().params;
  const queryClient = useQueryClient();
  const thread = useSupportThread(ticketId);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attempt = useRef<{ body: string; requestId: string } | null>(null);

  async function send() {
    const invalid = validateSupportMessage(reply, 1);
    if (invalid) { setError(invalid); return; }
    if (attempt.current?.body !== reply.trim()) attempt.current = { body: reply.trim(), requestId: newRequestId() };
    setSending(true); setError(null);
    try {
      await supportApi.reply(ticketId, reply, attempt.current.requestId);
      attempt.current = null;
      setReply('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['support-ticket', ticketId] }),
        queryClient.invalidateQueries({ queryKey: ['support-tickets'] }),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send. Try again.');
    } finally {
      setSending(false);
    }
  }

  const ticket = thread.data?.ticket;
  const messages = [...(thread.data?.messages ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <View className="flex-1 bg-[#fbfbfb]">
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-safe-offset-3">
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" className="h-9 w-9 items-center justify-center">
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-[18px] font-bold text-ink">{ticket ? supportCategoryLabel(ticket.category) : 'Support request'}</Text>
          {ticket && <Text className="text-[12.5px] font-medium text-ink/55">{SUPPORT_STATUS_LABEL[ticket.status] ?? ticket.status}</Text>}
        </View>
      </View>

      {thread.isPending ? (
        <ActivityIndicator className="mt-10" color={colors.ink} />
      ) : thread.isError ? (
        <Pressable onPress={() => void thread.refetch()} className="px-4"><Text className="text-[13px] font-medium text-danger">Could not load this request. Tap to retry.</Text></Pressable>
      ) : (
        <ScrollView contentContainerClassName="gap-2.5 px-4 pb-6" keyboardShouldPersistTaps="handled">
          {messages.map((m) => {
            const fromSupport = m.actor_role === 'admin';
            return (
              <View key={m.id} className={`max-w-[85%] rounded-[16px] px-4 py-3 ${fromSupport ? 'self-start border bg-white' : 'self-end bg-ink'}`} style={fromSupport ? { borderColor: CARD_BORDER } : undefined}>
                <Text className={`text-[11.5px] font-semibold ${fromSupport ? 'text-ink/55' : 'text-white/70'}`}>{fromSupport ? 'Support' : 'You'} · {stamp(m.created_at)}</Text>
                <Text className={`mt-1 text-[14.5px] ${fromSupport ? 'text-ink' : 'text-white'}`}>{m.body}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      <View className="gap-2 border-t bg-white px-4 pb-safe-offset-3 pt-3" style={{ borderColor: CARD_BORDER }}>
        {error && <Text className="text-[13px] font-medium text-danger">{error}</Text>}
        <View className="flex-row items-end gap-2">
          <TextInput value={reply} onChangeText={setReply} multiline maxLength={2000} placeholder={ticket?.status === 'resolved' ? 'Reply to reopen this request' : 'Write a reply'}
            placeholderTextColor="#9CA3AF" className="max-h-[120px] flex-1 rounded-[13px] border px-3.5 py-2.5 text-[15px] text-ink" style={{ borderColor: CARD_BORDER }} />
          <Pressable onPress={() => void send()} disabled={sending || !reply.trim()} className="rounded-full bg-ink px-4 py-3" style={{ opacity: sending || !reply.trim() ? 0.5 : 1 }}>
            <Text className="text-[14px] font-semibold text-white">{sending ? '…' : 'Send'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
