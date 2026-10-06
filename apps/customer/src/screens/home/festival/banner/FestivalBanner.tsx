import { AppImage } from '../../../../components/AppImage';
import { NAVRATRI_FESTIVAL } from '../data';

const artwork = NAVRATRI_FESTIVAL.bannerArtwork;

// Scale height with width using the artwork's proportions. No letterboxing,
// cropping or external vertical spacing around the festival banner.
export function FestivalBanner() {
  return (
    <AppImage
      source={{ uri: artwork.uri }}
      style={{ width: '100%', aspectRatio: artwork.width / artwork.height }}
      resizeMode="contain"
      priority="high"
      accessibilityLabel="Navratri celebration"
    />
  );
}
