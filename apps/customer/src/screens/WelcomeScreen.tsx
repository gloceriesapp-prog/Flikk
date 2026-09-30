import { Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { ShoppingBasket03Icon } from '@hugeicons/core-free-icons';

import { AppIcon } from '../components/AppIcon';

export function WelcomeScreen() {
  return (
    <View className="flex-1 bg-[#155DFC]">
      <StatusBar style="light" />

      {/* FULL-SCREEN BACKGROUND ONLY */}
      <LinearGradient
        colors={[
          '#0020C5',
          '#155DFC',
          '#2CA5FD',
        ]}
        locations={[0, 0.52, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        className="absolute inset-0"
      />

      {/* COMPACT BRAND CONTENT */}
      <View className="flex-1 items-center justify-center">
        <View className="items-center">
          {/* ICON */}
          <View
            className="
              h-[72px]
              w-[72px]
              items-center
              justify-center
              rounded-[22px]
              bg-white/10
            "
          >
            <AppIcon
              icon={ShoppingBasket03Icon}
              size={42}
              color="#FFFFFF"
              strokeWidth={1.7}
            />
          </View>

          {/* BRAND */}
          <Text
            className="
              mt-4
              text-[27px]
              font-bold
              tracking-[-0.7px]
              text-white
            "
          >
            Gloceries
          </Text>

          {/* SMALL BRAND LINE */}
        <Text
  className="
    mt-1.5
    text-[16px]
    font-medium
    tracking-[0.2px]
    text-white/65
  "
>
  Shop local with Gloceries
</Text>
        </View>
      </View>
    </View>
  );
}