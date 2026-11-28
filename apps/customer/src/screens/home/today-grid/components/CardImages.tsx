import { View } from 'react-native';
import { AppImage } from '../../../../components/AppImage';

// Two product photos side by side filling the card's middle, bottom-aligned
// on the offer strip, slightly overlapping.
export function CardImages({ urls, width, height }: { urls: string[]; width: number; height: number }) {
  const photos = urls.slice(0, 2);
  const photoWidth = photos.length > 1 ? Math.round(width * 0.54) : Math.round(width * 0.8);
  return (
    <View className="w-full flex-row items-end justify-center overflow-hidden pb-1.5" style={{ height }}>
      {photos.map((uri, index) => (
        <AppImage key={uri} source={{ uri }} resizeMode="contain" accessible={false} testID="today-photo"
          style={{ width: photoWidth, height: Math.max(1, height - 8), marginLeft: index ? -photoWidth * 0.12 : 0 }} />
      ))}
    </View>
  );
}
