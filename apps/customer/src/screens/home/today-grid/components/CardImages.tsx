import { View } from 'react-native';
import { AppImage } from '../../../../components/AppImage';
import { tint } from '../layout';

// Up to two product photos on a 10% wash of the card's accent.
export function CardImages({ urls, accent, height, radius = 14 }: { urls: string[]; accent: string; height: number; radius?: number }) {
  const photos = urls.slice(0, 2);
  return (
    <View className="flex-row items-end justify-center overflow-hidden" style={{ height, borderRadius: radius, backgroundColor: tint(accent) }}>
      {photos.map((uri, index) => (
        <AppImage key={uri} source={{ uri }} resizeMode="contain" accessible={false}
          style={{ width: photos.length > 1 ? '54%' : '78%', height: '92%', marginLeft: index ? '-12%' : 0 }} />
      ))}
    </View>
  );
}
