import { BrowseLoadingText, BROWSE_LOADING_COPY } from '../../loading/BrowseLoadingText';
import { useEffect, useState } from 'react';
import { Image as NativeImage, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppImage as Image } from '../../../../components/AppImage';

const IMAGE_URL = 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/regional-brand.png';
const MAX_BANNER_WIDTH = 420;

export function RegionalBrandBanner() {
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    NativeImage.getSize(IMAGE_URL, (width, height) => {
      if (!active) return;
      if (width > 0 && height > 0) setImageSize({ width, height });
      else setFailed(true);
    }, () => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [attempt]);

  // Keep side gutters and cap larger screens without changing proportions.
  const width = Math.min(containerWidth, MAX_BANNER_WIDTH);
  return (
    <View className="mx-5 mt-8 items-center" onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}>
      {failed ? (
        <Pressable accessibilityRole="button" onPress={() => { setFailed(false); setImageSize(null); setAttempt((value) => value + 1); }} className="min-h-12 items-center justify-center px-5 py-3"><Text className="text-sm font-semibold text-[#155DFC]">Reload banner</Text></Pressable>
      ) : imageSize && width > 0 ? (
        <View className="relative overflow-hidden" style={{ width, height: width * imageSize.height / imageSize.width, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
          <Image source={{ uri: IMAGE_URL }} style={StyleSheet.absoluteFill} resizeMode="contain" onError={() => setFailed(true)} accessible accessibilityLabel="Regional brands" />
          <LinearGradient colors={['#FFFFFF00', '#FFFFFF30', '#FFFFFFB3', '#FFFFFF']} locations={[0, 0.35, 0.75, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '28%' }} />
        </View>
      ) : <View className="min-h-12 justify-center"><BrowseLoadingText message={BROWSE_LOADING_COPY.regional} /></View>}
    </View>
  );
}
