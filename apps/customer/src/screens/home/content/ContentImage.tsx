import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppImage } from '../../../components/AppImage';
import type { HomeContentSection } from './contracts';
import { HomeGrownHeaderImage } from '../fresh/home-grown-nearby/HomeGrownHeaderImage';

export function ContentImage({
  section,
  side = false,
  naturalAspectRatio = false,
}: {
  section: HomeContentSection;
  side?: boolean;
  naturalAspectRatio?: boolean;
}) {
  const [loadedSize, setLoadedSize] = useState<{ url: string; ratio: number } | null>(null);
  const aspectRatio =
    naturalAspectRatio && loadedSize?.url === section.imageUrl
      ? loadedSize.ratio
      : section.imageAspectRatio;
  if (!section.imageUrl) return null;
  if (side)
    return (
      <HomeGrownHeaderImage
        imageUrl={section.imageUrl}
        aspectRatio={section.imageAspectRatio}
        fade={section.imageFade}
      />
    );
  const color = section.backgroundColor || '#FFFFFF';
  return (
    <View
      pointerEvents="none"
      style={{
        width: side ? '44%' : '100%',
        maxWidth: side ? 176 : undefined,
        aspectRatio,
        overflow: 'hidden',
      }}
    >
      <AppImage
        source={{ uri: section.imageUrl }}
        className="h-full w-full"
        resizeMode="contain"
        onLoad={naturalAspectRatio ? ({ source }) => {
          if (source.width > 0 && source.height > 0)
            setLoadedSize({ url: section.imageUrl, ratio: source.width / source.height });
        } : undefined}
      />
      {section.imageFade && (
        <>
          {!naturalAspectRatio && <LinearGradient
            colors={[color, `${color}CC`, `${color}4D`, `${color}00`]}
            locations={[0, 0.2, 0.65, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { width: '52%' }]}
          />}
          <LinearGradient
            colors={naturalAspectRatio
              ? [`${color}00`, `${color}30`, `${color}B3`, color]
              : [`${color}00`, `${color}66`, `${color}D9`, color, color]}
            locations={naturalAspectRatio ? [0, 0.35, 0.75, 1] : [0, 0.3, 0.6, 0.85, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: naturalAspectRatio ? '28%' : '62%' }}
          />
        </>
      )}
    </View>
  );
}
