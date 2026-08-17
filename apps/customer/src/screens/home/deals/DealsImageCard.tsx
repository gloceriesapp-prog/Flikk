// Just an image — no heading, no CTA, no badge. Full-width, single card.
// White/light-gray backing surface behind the image itself — cleaner than
// letting the image sit directly on the page, especially since the
// placeholder has a white background of its own.

import { Image, View } from 'react-native';

interface Props {
  uri: string;
}

export function DealsImageCard({ uri }: Props) {
  return (
    <View className="h-48 w-full overflow-hidden rounded-3xl border border-gray-100 bg-white">
      <Image source={{ uri }} className="h-full w-full" resizeMode="cover" />
    </View>
  );
}
