import { useRef, useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../navigation/types';
import { useAppConfig, useCopy } from '../../api/appConfig';
import { IconlyHeadphone } from '../../components/icons/iconly';
import { colors } from '../../theme/tokens';
import { CareLayout, CareButton, CareCard } from './components/CareLayout';
import { supportEmailAddress, supportEmailUrl } from './supportEmail';

type Props = NativeStackScreenProps<AppStackParamList, 'Support'>;

export function SupportScreen({ navigation, route }: Props) {
  const { support } = useAppConfig();
  const hours = useCopy('support.hours.text');
  const email = supportEmailAddress(support.email);
  const [opening, setOpening] = useState(false);
  const lock = useRef(false);

  async function openEmail() {
    if (lock.current) return;
    lock.current = true;
    setOpening(true);
    try {
      await Linking.openURL(supportEmailUrl(email, route.params?.category, route.params?.target));
    } catch {
      Alert.alert('Email app unavailable', `Send your request to ${email} from your preferred email app. Include your order number if your question is about an order.`);
    } finally {
      lock.current = false;
      setOpening(false);
    }
  }

  return (
    <CareLayout allowGuest title="Help & support" onBack={() => navigation.goBack()}>
      <CareCard>
        <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF3FF]">
          <IconlyHeadphone size={23} color={colors.primary} />
        </View>
        <Text accessibilityRole="header" className="text-[22px] font-bold leading-7 tracking-tight text-ink">
          How can we help?
        </Text>
        <Text className="mt-2 text-[15px] leading-[22px] text-ink/70">
          Email us about an order, payment, or your account. For order questions, include your order number.
        </Text>

        <View className="my-5 gap-1.5 rounded-2xl bg-[#F5F6F8] px-4 py-3.5">
          <Text className="text-[13px] font-semibold text-ink/65">Support email</Text>
          <Text selectable className="text-base font-semibold text-ink">{email}</Text>
          {hours ? <Text className="text-sm leading-5 text-ink/65">{hours}</Text> : null}
        </View>
        <CareButton label={opening ? 'Opening email…' : 'Email support'} onPress={() => void openEmail()} disabled={opening} />
        <Text className="mt-3 text-center text-sm leading-5 text-ink/65">Replies arrive in your email inbox.</Text>
      </CareCard>

      <Text className="px-1 text-sm leading-5 text-ink/65">Keep your OTP, card PIN, and UPI PIN private.</Text>
    </CareLayout>
  );
}
