// Frequently asked questions (admin "App settings" > Customer FAQ, migration
// 112; served in GET /app-config). Reached from Help & support.
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../navigation/types';
import { useAppConfigQuery } from '../../api/appConfig';
import { CareLayout, CareButton, CareEmpty } from './components/CareLayout';

type Props = NativeStackScreenProps<AppStackParamList, 'Faq'>;

export function FaqScreen({ navigation }: Props) {
  const config = useAppConfigQuery();
  const faqs = config.data?.faqs ?? [];
  const [open, setOpen] = useState<string | null>(null);
  return (
    <CareLayout title="Common questions" onBack={() => navigation.goBack()}>
      {config.isPending ? <Text className="text-sm text-gray-600">Loading…</Text> : null}
      {config.isError && !config.data ? (
        <>
          <CareEmpty text="We couldn’t load the questions." />
          <CareButton label="Try again" onPress={() => void config.refetch()} />
        </>
      ) : null}
      {!config.isPending && !config.isError && faqs.length === 0 ? <CareEmpty text="No common questions yet. Contact us from Help & support." /> : null}
      {faqs.map((faq) => (
        <Pressable key={faq.id} accessibilityRole="button" accessibilityState={{ expanded: open === faq.id }}
          onPress={() => setOpen(open === faq.id ? null : faq.id)} className="rounded-2xl bg-white p-4">
          <View className="flex-row items-start gap-3">
            <Text className="flex-1 text-[15px] font-bold text-black">{faq.question}</Text>
            <Text className="text-base font-bold text-gray-500">{open === faq.id ? '−' : '+'}</Text>
          </View>
          {open === faq.id ? <Text className="mt-2 text-sm leading-6 text-gray-700">{faq.answer}</Text> : null}
        </Pressable>
      ))}
    </CareLayout>
  );
}
