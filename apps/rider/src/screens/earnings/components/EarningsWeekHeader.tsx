// Week label row. The prev/next arrows are hidden for now (design call);
// onPrev/onNext stay wired from EarningsScreen so they can come back.

import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  weekLabel: string;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function EarningsWeekHeader({ weekLabel }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top + 16 }} className="flex-row items-center bg-[#F8F8F8] px-5 pb-5">
      <Text className="flex-1 text-center text-[17px] font-semibold text-ink">{weekLabel}</Text>
    </View>
  );
}
