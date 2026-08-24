// Trailing tile in the horizontal row — same fixed-width landscape footprint
// as NearbyStoreCard (w-36/h-28, bumped up to match) so it reads as "one
// more item in the row," not a separate button bolted on the end.

import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import { colors } from '../../../../theme/tokens';

interface Props {
  onPress: () => void;
}

export function ViewAllStoresTile({ onPress }: Props) {
  return (
    <Pressable onPress={onPress} className="w-36 gap-2">
      <View className="h-28 w-36 items-center justify-center gap-1 rounded-2xl border border-mist bg-mist">
        <AppIcon icon={ArrowRight01Icon} size={24} color={colors.limeDeep} />
        <Text className="text-center text-sm font-bold text-lime-deep">View all</Text>
      </View>
      <Text className="text-center text-sm font-semibold text-transparent" numberOfLines={1}>
        {/* spacer — keeps this tile's label row the same height as NearbyStoreCard's name line */}
        .
      </Text>
    </Pressable>
  );
}
