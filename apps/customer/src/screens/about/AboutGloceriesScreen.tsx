import { Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import type { AppStackParamList } from '../../navigation/types';
import { useAppConfig } from '../../api/appConfig';
import { openLink } from '../../utils/openLink';

// Shown until admin fills app_content.about.body (GET /app-config).
const DEFAULT_BODY = [
  'Gloceries brings everyday shopping from nearby stores to your phone. Discover groceries, fresh produce, regional favourites and festival essentials in one place, with availability based on your delivery location.',
  'Browse products and pack sizes, compare prices and choose the supplies that suit your home. Your cart shows a clear bill before you order, and purchase history keeps your orders together for easy reference.',
  'We connect customers with local shops and delivery partners, helping you follow your order from preparation to delivery. When you need a hand, order-linked support makes it easier to get help with your purchase.',
];

function LinkRow({ label, detail, url }: { label: string; detail?: string; url: string }) {
  return (
    <Pressable onPress={() => openLink(url)} accessibilityRole="link" accessibilityLabel={detail ? `${label}, ${detail}` : label} className="min-h-12 flex-row items-center justify-between border-b border-ink/10 py-3">
      <View className="flex-1 pr-3">
        <Text className="text-base font-semibold text-ink">{label}</Text>
        {detail ? <Text className="mt-0.5 text-sm text-ink/60">{detail}</Text> : null}
      </View>
      <AppIcon icon={ArrowRight01Icon} size={18} color="#101C10" />
    </Pressable>
  );
}

export function AboutGloceriesScreen({ navigation }: NativeStackScreenProps<AppStackParamList, 'AboutGloceries'>) {
  const { about, legal, support } = useAppConfig();
  const body = about.body.trim() ? about.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) : DEFAULT_BODY;
  const legalLinks = [
    { label: 'Terms of Service', url: legal.termsUrl },
    { label: 'Privacy Policy', url: legal.privacyUrl },
    { label: 'Refund Policy', url: legal.refundPolicyUrl },
  ].filter((l): l is { label: string; url: string } => !!l.url);
  const whatsappDigits = support.whatsapp?.replace(/\D/g, '');
  const contacts = [
    support.phone && { label: 'Call us', detail: support.phone, url: `tel:${support.phone.replace(/[^\d+]/g, '')}` },
    support.email && { label: 'Email us', detail: support.email, url: `mailto:${support.email}` },
    whatsappDigits && { label: 'WhatsApp', detail: support.whatsapp!, url: `https://wa.me/${whatsappDigits}` },
  ].filter((c): c is { label: string; detail: string; url: string } => !!c);

  return (
    <View className="flex-1 bg-white pt-safe">
      <StatusBar style="dark" />
      <View className="flex-row items-center px-5 py-4">
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8} className="h-11 w-11 items-center justify-center">
          <AppIcon icon={ArrowLeft01Icon} size={22} color="#101C10" />
        </Pressable>
        <Text accessibilityRole="header" className="flex-1 text-center text-lg font-semibold text-ink">{about.title}</Text>
        <View className="w-11" />
      </View>
      <ScrollView contentContainerClassName="gap-5 px-6 pb-safe-offset-8 pt-6">
        <Text className="text-3xl font-bold text-ink">Your neighbourhood, closer.</Text>
        {body.map((paragraph, i) => (
          <Text key={i} className="text-base leading-7 text-ink/70">{paragraph}</Text>
        ))}
        {contacts.length > 0 && (
          <View>
            <Text accessibilityRole="header" className="mb-1 text-sm font-semibold uppercase text-ink/50">Contact support</Text>
            {contacts.map((c) => <LinkRow key={c.label} {...c} />)}
          </View>
        )}
        {legalLinks.length > 0 && (
          <View>
            <Text accessibilityRole="header" className="mb-1 text-sm font-semibold uppercase text-ink/50">Legal</Text>
            {legalLinks.map((l) => <LinkRow key={l.label} {...l} />)}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
