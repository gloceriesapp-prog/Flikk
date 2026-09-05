// Pure image poster/ad — replaces PromoBanner (badge/heading/CTA text
// overlay) across every tab, per an explicit ask to drop all banner text
// entirely and keep this image-only. Real photo (admin's Home Categories ->
// selected tab's own "Ads & posters" section), no fallback/dummy image —
// callers only render this when a real banner exists.

import { View } from 'react-native';
import { AppImage as Image } from '../../../../components/AppImage';

interface Props {
  imageUri: string;
}

export function PosterBanner({ imageUri }: Props) {
  return (
    <View className="mx-5 mt-6">
      <View className="h-48 overflow-hidden rounded-3xl border border-gray-100 bg-white">
        <Image source={{ uri: imageUri }} className="h-full w-full" resizeMode="cover" />
      </View>
    </View>
  );
}
