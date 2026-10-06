import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowRight01Icon, Sun01Icon, GridViewIcon } from '@hugeicons/core-free-icons';
import type { AppStackParamList } from '../../../../navigation/types';
import { AppIcon } from '../../../../components/AppIcon';
import { SectionTitle } from '../../components/SectionTitle';
import { HOME_DISCOVERY_CARDS } from './data';

export function LightUpHomeSection() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  return (
    <View className="pt-8">
      <SectionTitle>Light up home</SectionTitle>
      <View className="gap-3 px-5">
        {HOME_DISCOVERY_CARDS.map((card) => (
          <Pressable
            key={card.collection}
            accessibilityRole="button"
            accessibilityLabel={`Explore ${card.title}`}
            onPress={() => navigation.navigate('FestivalCollection', { collection: card.collection })}
            className="min-h-[112px] flex-row items-center gap-4 overflow-hidden rounded-3xl px-5 py-5 active:opacity-80"
            style={{ backgroundColor: card.background }}
          >
            <View className="h-16 w-16 items-center justify-center rounded-full bg-white/70">
              <AppIcon icon={card.collection === 'lights-and-diyas' ? Sun01Icon : GridViewIcon} size={34} color={card.accent} strokeWidth={1.6} />
            </View>
            <View className="flex-1">
              <Text className="text-[17px] font-bold text-ink">{card.title}</Text>
              <Text className="mt-1 text-[12px] text-ink/60">{card.detail}</Text>
            </View>
            <View className="h-9 w-9 items-center justify-center rounded-full bg-white/80">
              <AppIcon icon={ArrowRight01Icon} size={18} color={card.accent} />
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
