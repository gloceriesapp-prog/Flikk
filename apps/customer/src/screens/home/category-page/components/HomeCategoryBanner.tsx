import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppImage } from '../../../../components/AppImage';

const DEFAULT_BANNER_URI =
  'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/store-image1.jpeg';

// A shared default for every category; callers can supply specific artwork later.
export function HomeCategoryBanner({
  imageUri = DEFAULT_BANNER_URI,
  backgroundColor = '#F3F4F6',
  imageFit = 'cover',
  seamless = false,
}: {
  imageUri?: string;
  backgroundColor?: string;
  imageFit?: 'cover' | 'contain';
  seamless?: boolean;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <View className="overflow-hidden" style={{
      height: Math.max(width * 7 / 16, 60) + insets.top,
      backgroundColor,
      marginBottom: seamless ? 0 : 12,
      borderBottomLeftRadius: seamless ? 0 : 24,
      borderBottomRightRadius: seamless ? 0 : 24,
    }}>
      <AppImage
        source={{ uri: imageUri }}
        style={{ width: '100%', height: '100%' }}
        resizeMode={imageFit}
        contentPosition={imageFit === 'contain' ? 'bottom center' : 'center'}
        priority="high"
        transition={0}
        accessible={false}
      />
    </View>
  );
}
