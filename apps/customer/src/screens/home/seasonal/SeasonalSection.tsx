// The admin Seasonal Section: an optional poster banner and up to four tiles
// (title, image, background colour). Banner and tiles are independent; with
// neither active the section renders nothing, leaving no gap on Home.
import { Text, View } from 'react-native';
import { AppImage } from '../../../components/AppImage';
import { SectionTitle } from '../components/SectionTitle';
import { useSeasonalSection } from './useSeasonalSection';

// Posters are wide artwork; a fixed ratio keeps layout stable while loading.
const BANNER_ASPECT_RATIO = 2.4;

interface Props {
  title?: string;
  subtitle?: string | null;
}

export function SeasonalSection({ title, subtitle }: Props) {
  const { data } = useSeasonalSection();
  if (!data || (!data.bannerImageUrl && data.tiles.length === 0)) return null;
  return (
    <View className="pt-8">
      {title?.trim() ? <SectionTitle subtitle={subtitle}>{title}</SectionTitle> : null}
      {data.bannerImageUrl && (
        <View className="px-5">
          <AppImage
            source={{ uri: data.bannerImageUrl }}
            style={{ width: '100%', aspectRatio: BANNER_ASPECT_RATIO, borderRadius: 20 }}
            resizeMode="cover"
            accessibilityLabel={title?.trim() || 'Seasonal offers'}
          />
        </View>
      )}
      {data.tiles.length > 0 && (
        <View className={`flex-row flex-wrap gap-2.5 px-5 ${data.bannerImageUrl ? 'pt-3' : ''}`}>
          {data.tiles.map((tile) => (
            <View
              key={tile.id}
              className="h-28 overflow-hidden rounded-3xl p-3"
              style={{ backgroundColor: tile.bgColor, width: data.tiles.length === 1 ? '100%' : '48.5%' }}
            >
              <Text numberOfLines={2} className="text-[14px] font-bold leading-[18px] text-ink">{tile.title}</Text>
              {tile.imageUrl && (
                <AppImage
                  source={{ uri: tile.imageUrl }}
                  className="absolute -bottom-2 -right-1 h-20 w-20"
                  resizeMode="contain"
                  accessibilityLabel={tile.title}
                />
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
