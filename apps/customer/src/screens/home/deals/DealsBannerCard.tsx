// Content only — no outer card styling (border/bg/rounding), that lives in
// DealsSection.tsx so the banner and the countdown row below it read as one
// continuous card, split by a single divider line.

import { Image, Pressable, Text, View } from 'react-native';

export function DealsBannerCard() {
  return (
    <View className="gap-3 p-5">
      <View className="flex-row items-center gap-4">
        <View className="flex-1 gap-3">
          <Text className="text-xl font-extrabold leading-6 text-coral">Thousands{'\n'}of deals.</Text>
          <Text className="text-sm text-ink/70">Low Prices. Every day.</Text>
          <Pressable className="self-start rounded-full bg-coral px-4 py-2">
            <Text className="text-xs font-bold text-white">View all deals</Text>
          </Pressable>
        </View>

        <View className="relative h-28 w-28 overflow-hidden rounded-2xl bg-mist">
          <Image
            source={{ uri: 'https://picsum.photos/seed/flikk-deals/300/300' }}
            className="h-full w-full"
            resizeMode="cover"
          />
          <View className="absolute bottom-1 right-1 rounded-full bg-black/60 px-1.5 py-0.5">
            <Text className="text-[9px] font-semibold text-white">1/10</Text>
          </View>
        </View>
      </View>

      {/* decorative pagination dots — single static placeholder image for now */}
      <View className="flex-row justify-center gap-1">
        {[0, 1, 2, 3].map((i) => (
          <View key={i} className={`h-1.5 rounded-full ${i === 0 ? 'w-4 bg-coral' : 'w-1.5 bg-mist'}`} />
        ))}
      </View>
    </View>
  );
}
