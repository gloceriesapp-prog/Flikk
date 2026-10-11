import { Text, View } from 'react-native';

const BRAND_BLUE = '#155dfc';

export function WelcomeScreen() {
  return (
    <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: BRAND_BLUE }}>
      <Text className="text-[34px] font-bold tracking-tight text-white">Gloceries</Text>
      <Text className="mt-2 text-[14px] font-medium tracking-[1px] text-white/80">for Partners</Text>
    </View>
  );
}
