import { useState } from 'react';
import { AppImage } from '../../../components/AppImage';

// Optional artwork never blocks a shelf; failed URLs disappear until changed.
export function HomeSectionBanner({ imageUrl, title }: { imageUrl?: string | null; title: string }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  if (!imageUrl || failedUrl === imageUrl || !imageUrl.startsWith('https://')) return null;
  return <AppImage source={{ uri: imageUrl }} resizeMode="cover"
    style={{ width: '100%', aspectRatio: 4 }} accessibilityLabel={title}
    onError={() => setFailedUrl(imageUrl)} />;
}
