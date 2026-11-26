import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import { useCopy, useCopyImage } from '../../../api/appConfig';

// Admin App content: home.welcome.imageUrl / home.welcome.label. The new
// Your Shops artwork is the default; admin can still override it from App
// content (that override read is also what keeps home.welcome.imageUrl a
// consumed copy key — see backend copyKeys.test.ts).
const WELCOME_ARTWORK_URI = 'https://images.gloceries.com/appsui/Your%20Shops.png';

// The banner keeps the full width and takes its height from the artwork's
// own shape (546x180 → about 3:1; 1920x1080 → 16:9), so nothing is cropped
// and no empty bands show. 16:9 holds the space until the first load; the
// measured shape is remembered per image so later Home visits don't jump.
const DEFAULT_RATIO = 16 / 9;
// Guards against a broken or extreme upload (a tall poster or a thin strip).
const MIN_RATIO = 1;
const MAX_RATIO = 5;
const ratioByUri = new Map<string, number>();

export function welcomeBannerRatio(width: number | undefined, height: number | undefined): number | null {
  if (!width || !height || !Number.isFinite(width / height)) return null;
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, width / height));
}

export function HomeWelcomeBanner() {
  const uri = useCopyImage('home.welcome.imageUrl', WELCOME_ARTWORK_URI);
  const label = useCopy('home.welcome.label');
  const [measured, setMeasured] = useState<{ uri: string; ratio: number } | null>(null);
  const ratio = (measured?.uri === uri ? measured.ratio : ratioByUri.get(uri)) ?? DEFAULT_RATIO;

  return (
    <View style={{ width: '100%', aspectRatio: ratio }}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        transition={0}
        priority="high"
        accessible
        accessibilityLabel={label}
        onLoad={(event) => {
          const next = welcomeBannerRatio(event.source.width, event.source.height);
          if (!next) return;
          ratioByUri.set(uri, next);
          setMeasured((current) => current?.uri === uri && current.ratio === next ? current : { uri, ratio: next });
        }}
      />
    </View>
  );
}
