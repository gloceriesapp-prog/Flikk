// Help & support — the admin-configured contacts (call / WhatsApp / email,
// each shown only when set on admin "App settings") plus support tickets:
// raise a new request (optionally about one of your orders) and see every
// request's status. Tickets land in the admin Support inbox; replies show on
// SupportTicketScreen. Same screen in apps/rider (kept in sync by hand;
// the data logic is shared in @gloceries/shared's support module).

import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft01Icon, ArrowRight01Icon, CallIcon, Mail01Icon, WhatsappIcon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react-native';
import {
  STAFF_SUPPORT_CATEGORIES, SUPPORT_STATUS_LABEL, newRequestId, supportCallUrl, supportCategoryLabel, supportEmailUrl,
  supportWhatsAppUrl, validateSupportMessage, type StaffSupportCategory,
} from '@gloceries/shared';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { supportApi } from '../../api/support';
import { useSupportContacts, useSupportOrders, useSupportTickets } from './useSupport';
import type { AppStackParamList } from '../../navigation/types';

const CARD_BORDER = '#EAECEE';
const APP_NAME = 'store app';

function ContactButton({ icon, label, onPress }: { icon: IconSvgElement; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" className="flex-1 items-center gap-1.5 rounded-[16px] border py-3.5" style={{ borderColor: CARD_BORDER }}>
      <AppIcon icon={icon} size={20} color={colors.ink} />
      <Text className="text-[13px] font-semibold text-ink">{label}</Text>
    </Pressable>
  );
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export function SupportScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<AppStackParamList, 'Support'>>();
  const queryClient = useQueryClient();
  const contacts = useSupportContacts();
  const tickets = useSupportTickets();
  const [composing, setComposing] = useState(route.params?.compose === true);
  const orders = useSupportOrders(composing);
  const [category, setCategory] = useState<StaffSupportCategory>('order_issue');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One idempotency key per attempt: a retry after a timeout returns the
  // same ticket instead of creating a second one.
  const attempt = useRef<{ key: string; requestId: string } | null>(null);

  const c = contacts.data;
  const call = c && supportCallUrl(c);
  const whatsapp = c && supportWhatsAppUrl(c, `Hi, I need help with the ${APP_NAME}.`);
  const email = c && supportEmailUrl(c, `${APP_NAME} help`);

  function open(url: string) {
    Linking.openURL(url).catch(() => Alert.alert('Could not open', 'No app on this phone can open that.'));
  }

  async function submit() {
    const invalid = validateSupportMessage(message);
    if (invalid) { setError(invalid); return; }
    const key = `${category}|${orderId ?? ''}|${message.trim()}`;
    if (attempt.current?.key !== key) attempt.current = { key, requestId: newRequestId() };
    setSubmitting(true); setError(null);
    try {
      const { id } = await supportApi.create({ category, orderId, message }, attempt.current.requestId);
      attempt.current = null;
      setMessage(''); setOrderId(null); setComposing(false);
      await queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      navigation.navigate('SupportTicket', { ticketId: id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-[#fbfbfb]">
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-safe-offset-3">
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" className="h-9 w-9 items-center justify-center">
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>
        <Text className="text-[18px] font-bold text-ink">Help & support</Text>
      </View>

      <ScrollView contentContainerClassName="gap-5 px-4 pb-12" keyboardShouldPersistTaps="handled">
        {contacts.isPending ? (
          <ActivityIndicator color={colors.ink} />
        ) : call || whatsapp || email ? (
          <View className="flex-row gap-2.5">
            {call && <ContactButton icon={CallIcon} label="Call" onPress={() => open(call)} />}
            {whatsapp && <ContactButton icon={WhatsappIcon} label="WhatsApp" onPress={() => open(whatsapp)} />}
            {email && <ContactButton icon={Mail01Icon} label="Email" onPress={() => open(email)} />}
          </View>
        ) : (
          <Text className="text-[13px] font-medium text-ink/55">Raise a request below and our support team will reply here.</Text>
        )}

        {composing ? (
          <View className="gap-3 rounded-[16px] border bg-white p-4" style={{ borderColor: CARD_BORDER }}>
            <Text className="text-[15px] font-semibold text-ink">What do you need help with?</Text>
            <View className="flex-row flex-wrap gap-2">
              {STAFF_SUPPORT_CATEGORIES.map((option) => (
                <Pressable key={option.key} onPress={() => setCategory(option.key)} accessibilityRole="button"
                  className={`rounded-full px-3.5 py-2 ${category === option.key ? 'bg-ink' : 'bg-[#F1F1F4]'}`}>
                  <Text className={`text-[13px] font-semibold ${category === option.key ? 'text-white' : 'text-ink'}`}>{option.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text className="text-[13px] font-semibold text-ink/60">About an order (optional)</Text>
            {orders.isPending ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                <Pressable onPress={() => setOrderId(null)} className={`rounded-full px-3.5 py-2 ${orderId === null ? 'bg-ink' : 'bg-[#F1F1F4]'}`}>
                  <Text className={`text-[13px] font-semibold ${orderId === null ? 'text-white' : 'text-ink'}`}>No order</Text>
                </Pressable>
                {(orders.data ?? []).map((order) => (
                  <Pressable key={order.id} onPress={() => setOrderId(order.id)} className={`rounded-full px-3.5 py-2 ${orderId === order.id ? 'bg-ink' : 'bg-[#F1F1F4]'}`}>
                    <Text className={`text-[13px] font-semibold ${orderId === order.id ? 'text-white' : 'text-ink'}`}>
                      #{order.order_number ?? order.id.slice(0, 8).toUpperCase()}{order.stores?.name ? ` · ${order.stores.name}` : ''}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            <TextInput value={message} onChangeText={setMessage} multiline maxLength={2000} placeholder="Describe the problem (at least 10 characters)"
              placeholderTextColor="#9CA3AF" className="min-h-[110px] rounded-[13px] border px-3.5 py-3 text-[15px] text-ink" style={{ borderColor: CARD_BORDER, textAlignVertical: 'top' }} />
            {error && <Text className="text-[13px] font-medium text-danger">{error}</Text>}
            <View className="flex-row gap-2.5">
              <Pressable onPress={() => { setComposing(false); setError(null); }} className="flex-1 items-center rounded-full bg-[#F1F1F4] py-3">
                <Text className="text-[14px] font-semibold text-ink">Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void submit()} disabled={submitting} className="flex-1 items-center rounded-full bg-ink py-3" style={{ opacity: submitting ? 0.5 : 1 }}>
                <Text className="text-[14px] font-semibold text-white">{submitting ? 'Sending…' : 'Send request'}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setComposing(true)} accessibilityRole="button" className="items-center rounded-full bg-ink py-3.5">
            <Text className="text-[15px] font-semibold text-white">Raise a new request</Text>
          </Pressable>
        )}

        <View className="gap-2.5">
          <Text className="text-[15px] font-bold text-ink">Your requests</Text>
          {tickets.isPending ? (
            <ActivityIndicator color={colors.ink} />
          ) : tickets.isError ? (
            <Pressable onPress={() => void tickets.refetch()}><Text className="text-[13px] font-medium text-danger">Could not load your requests. Tap to retry.</Text></Pressable>
          ) : (tickets.data ?? []).length === 0 ? (
            <Text className="text-[13px] font-medium text-ink/55">No requests yet.</Text>
          ) : (
            (tickets.data ?? []).map((ticket) => (
              <Pressable key={ticket.id} onPress={() => navigation.navigate('SupportTicket', { ticketId: ticket.id })} accessibilityRole="button"
                className="flex-row items-center gap-3 rounded-[16px] border bg-white px-4 py-3.5" style={{ borderColor: CARD_BORDER }}>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-ink">{supportCategoryLabel(ticket.category)}</Text>
                  <Text className="mt-0.5 text-[12.5px] font-medium text-ink/55" numberOfLines={1}>{ticket.initial_message}</Text>
                  <Text className={`mt-1 text-[12px] font-semibold ${ticket.status === 'resolved' ? 'text-success' : 'text-ink/70'}`}>
                    {SUPPORT_STATUS_LABEL[ticket.status] ?? ticket.status} · {shortDate(ticket.updated_at)}
                  </Text>
                </View>
                <AppIcon icon={ArrowRight01Icon} size={18} color={colors.ink} />
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
