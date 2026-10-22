import { useState } from 'react';
import { View } from 'react-native';
import { BankIcon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { AppImage } from '../../../components/AppImage';

export function BankLogo({ code }: { code: string }) {
  const [failedCode, setFailedCode] = useState<string>();
  const showLogo = /^[A-Z0-9_]{2,20}$/.test(code) && failedCode !== code;
  return (
    <View className="h-10 w-10 items-center justify-center rounded-xl border border-[#F0F0F0] bg-white">
      {showLogo ? <AppImage source={{ uri: `https://cdn.razorpay.com/bank/${code}.gif` }}
        style={{ width: 28, height: 28 }} contentFit="contain" accessible={false}
        testID={`bank-logo-${code}`} onError={() => setFailedCode(code)} />
        : <View testID="bank-logo-fallback"><AppIcon icon={BankIcon} size={22} color="#737373" /></View>}
    </View>
  );
}
