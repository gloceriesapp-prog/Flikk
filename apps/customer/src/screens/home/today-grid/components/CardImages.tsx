import { View } from 'react-native';
import { AppImage } from '../../../../components/AppImage';

// The card's one image across its foot: full card width, sitting on the
// bottom edge (no padding below). A wide photo can show several products.
export function CardImages({ urls, height }: { urls: string[]; height: number }) {
  const uri = urls[0];
  return (
    <View className="w-full justify-end overflow-hidden" style={{ height }}>
      {uri ? <AppImage source={{ uri }} resizeMode="contain" contentPosition="bottom center" accessible={false} testID="today-photo"
        style={{ width: '100%', height: '100%' }} /> : null}
    </View>
  );
}
