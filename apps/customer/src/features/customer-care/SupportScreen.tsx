import { useRef, useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../navigation/types';
import { useAppConfig, useCopy } from '../../api/appConfig';
import { CareLayout, CareButton } from './components/CareLayout';
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
      <View className="w-full max-w-[520px] self-center rounded-3xl bg-white p-5">
        <Text accessibilityRole="header" className="text-[22px] font-bold text-black">We’re here to help</Text>
        <Text className="mt-3 text-[15px] leading-6 text-gray-600">
          Email us about your order, payment or account. Include your order number so we can help you faster.
        </Text>
        <Text selectable accessibilityLabel={`Support email: ${email}`} className="mt-5 text-[17px] font-semibold text-black">{email}</Text>
        {hours ? <Text className="mt-2 text-sm text-gray-600">{hours}</Text> : null}
        <View className="mt-5">
          <CareButton label={opening ? 'Opening email…' : 'Email support'} onPress={() => void openEmail()} disabled={opening} />
        </View>
        <Text className="mt-3 text-xs leading-5 text-gray-500">
          Opens your email app. Nothing is sent until you send the email. Replies arrive in your inbox.
        </Text>
      </View>
      <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Faq')}
        className="w-full max-w-[520px] self-center flex-row items-center justify-between rounded-2xl bg-white p-4">
        <Text className="text-[15px] font-bold text-black">Common questions</Text>
        <Text className="text-sm font-semibold text-black">View</Text>
      </Pressable>
      <Text className="w-full max-w-[520px] self-center text-sm leading-5 text-gray-500">
        Never share your OTP, card PIN or UPI PIN by email.
      </Text>
    </CareLayout>
  );
}
