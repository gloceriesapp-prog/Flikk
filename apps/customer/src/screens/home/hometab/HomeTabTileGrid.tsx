// Tile grid for an admin-added Home tab (real data, GET /home-tabs) — same
// 4-column visual as CategorySections/CategorySectionGroup.tsx but
// deliberately its own component: home_tab_tiles isn't a `categories` row,
// so it has no CategoryDetail screen to navigate to yet — tiles are
// display-only until that's built.
//
// Tab's own promo poster(s) render below the tile grid, real data (admin's
// "Ads & posters" section on this same tab), image only — the "ads and
// poster for different category" ask. Only the first active poster renders;
// a founder wanting a rotating set is a later upgrade, not built
// speculatively now.

import { Image, Text, View } from 'react-native';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import { PosterBanner } from '../category-tab/components/PosterBanner';
import type { RemoteHomeTab } from '../data/useHomeTabs';

interface Props {
  tab: RemoteHomeTab;
}

// Exactly 4 columns, guaranteed — each cell is a true 25% width, not
// 23%+margin (which summed to just over 100% once floating-point rounding
// hit all 4 columns in a full row and wrapped the 4th tile early — see
// category-tab/components/SubCategoryGrid.tsx's own note, same bug/fix).
const GAP = 12;

export function HomeTabTileGrid({ tab }: Props) {
  const banner = tab.banners[0];

  if (tab.tiles.length === 0 && !banner) {
    return (
      <View className="items-center justify-center gap-2 px-6 py-16">
        <Text className="text-base font-semibold text-ink">No items yet.</Text>
      </View>
    );
  }

  return (
    <View className="pb-32">
      {tab.tiles.length > 0 && (
        <View className="px-5 pt-6">
          <View className="flex-row flex-wrap" style={{ marginHorizontal: -GAP / 2 }}>
            {tab.tiles.map((tile) => (
              <View key={tile.id} style={{ width: '25%', paddingHorizontal: GAP / 2, paddingBottom: 20 }}>
                <View
                  className="aspect-square items-center justify-center overflow-hidden rounded-2xl border border-gray-100 shadow-md shadow-black/20"
                  style={{ backgroundColor: '#EDEDF0' }}
                >
                  <Image source={{ uri: tile.imageUrl || PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
                </View>
                <Text className="text-center text-sm font-medium leading-4 text-ink" numberOfLines={2}>
                  {tile.name}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {banner && <PosterBanner imageUri={banner.imageUrl} />}
    </View>
  );
}
