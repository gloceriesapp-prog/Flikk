import { StarIcon } from '@hugeicons/core-free-icons';
import { Pressable, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';

interface Props {
  rating: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}

export function OrderRatingStars({ rating, onChange, disabled = false }: Props) {
  return (
    <View className="w-full flex-row">
      {[1, 2, 3, 4, 5].map(value => (
        <Pressable
          key={value}
          accessibilityRole="button"
          accessibilityLabel={`Rate ${value} out of 5`}
          accessibilityState={{ selected: value <= rating, disabled }}
          disabled={disabled}
          onPress={() => onChange(value)}
          className="h-14 flex-1 items-center justify-center"
        >
          <AppIcon icon={StarIcon} size={32} color={value <= rating ? '#E5A900' : '#C8CDD3'} fill={value <= rating ? '#FFC928' : '#FFFFFF'} strokeWidth={1.5} />
        </Pressable>
      ))}
    </View>
  );
}
