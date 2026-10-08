import { AppImage } from '../../../../components/AppImage';
import { FESTIVAL_BANNER_ASPECT_RATIO } from '../data';

// Admin festival banner (festival_greeting.tab_banner_image_url). Scales
// height with width using the banner proportions; nothing without artwork.
export function FestivalBanner({ uri, label }: { uri: string | null; label: string }) {
  if (!uri) return null;
  return (
    <AppImage
      source={{ uri }}
      style={{ width: '100%', aspectRatio: FESTIVAL_BANNER_ASPECT_RATIO }}
      resizeMode="contain"
      priority="high"
      accessibilityLabel={`${label} celebration`}
    />
  );
}
