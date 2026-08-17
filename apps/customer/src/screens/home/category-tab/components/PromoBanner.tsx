// Photo banner with a dark gradient wash at the bottom so white text stays
// legible over whatever's in the photo — same LinearGradient-needs-style-not-
// className gotcha as HomeHeader.tsx. Copy/badge are per-tab (passed in by
// the caller), image is the shared app-wide placeholder — this is what
// makes it reusable across groceries/, bakery/, essentials/.

import { StyleSheet, Image, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PLACEHOLDER_IMAGE_URI } from '../../../../theme/placeholderImage';

interface Props {
  badgeLabel: string;
  heading: string;
  subheading: string;
  buttonLabel?: string;
}

export function PromoBanner({ badgeLabel, heading, subheading, buttonLabel = 'Shop now' }: Props) {
  return (
    <View className="mx-5 mt-6 gap-3">
      <View className="h-48 overflow-hidden rounded-3xl border border-gray-100 bg-white">
        <Image source={{ uri: PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />

        <LinearGradient
          colors={['transparent', 'rgba(16,28,16,0.85)']}
          locations={[0.35, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View className="absolute left-3 top-3 rounded-full bg-lime px-3 py-1">
          <Text className="text-[11px] font-bold text-ink">{badgeLabel}</Text>
        </View>

        <View className="absolute bottom-4 left-4 right-4 gap-2">
          <Text className="text-xl font-extrabold leading-6 text-white">{heading}</Text>
          <Text className="text-xs text-white/85">{subheading}</Text>
          <Pressable className="mt-1 self-start rounded-full bg-white px-4 py-2">
            <Text className="text-xs font-bold text-ink">{buttonLabel}</Text>
          </Pressable>
        </View>
      </View>

      {/* decorative pagination dots — single static placeholder image for now */}
      <View className="flex-row justify-center gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} className={`h-1.5 rounded-full ${i === 0 ? 'w-4 bg-lime-deep' : 'w-1.5 bg-mist'}`} />
        ))}
      </View>
    </View>
  );
}
