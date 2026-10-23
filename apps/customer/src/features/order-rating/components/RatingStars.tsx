import { StarIcon } from '@hugeicons/core-free-icons';
import { Pressable, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';

interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
  size?: number;
}

export function RatingStars({ label, value, onChange, size = 22 }: Props) {
  return (
    <View className="flex-row self-start">
      {[1, 2, 3, 4, 5].map(star => (
        <Pressable key={star} accessibilityRole="button"
          accessibilityLabel={`Rate ${label} ${star} out of 5`}
          accessibilityState={{ selected: star <= value }}
          onPress={() => onChange(star)} className="h-11 w-8 items-center justify-center">
          <AppIcon icon={StarIcon} size={size} color={star <= value ? '#E5A900' : '#A1A1AA'}
            fill={star <= value ? '#FFC928' : '#FFFFFF'} strokeWidth={1.7} />
        </Pressable>
      ))}
    </View>
  );
}
