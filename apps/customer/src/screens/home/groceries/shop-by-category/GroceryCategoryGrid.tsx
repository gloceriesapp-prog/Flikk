import { Pressable, Text, View } from 'react-native';
import { ShoppingBasket01Icon } from '@hugeicons/core-free-icons';

import { AppIcon } from '../../../../components/AppIcon';
import { AppImage } from '../../../../components/AppImage';
import type { HomeContentItem } from '../../content/contracts';

interface Props {
  items: HomeContentItem[];
  imageForItem: (item: HomeContentItem) => string | undefined;
  onOpen: (item: HomeContentItem) => void;
}

const TILE_BACKGROUND = '#F7F7F7';
const GAP = 10;

function formatCategoryTitle(title: string) {
  const words = title.trim().split(/\s+/);

  if (words.length <= 1) {
    return title;
  }

  let bestIndex = 1;
  let smallestDifference = Infinity;

  for (let i = 1; i < words.length; i++) {
    const firstLine = words.slice(0, i).join(' ');
    const secondLine = words.slice(i).join(' ');

    const difference = Math.abs(firstLine.length - secondLine.length);

    if (difference < smallestDifference) {
      smallestDifference = difference;
      bestIndex = i;
    }
  }

  return `${words.slice(0, bestIndex).join(' ')}\n${words
    .slice(bestIndex)
    .join(' ')}`;
}

export function GroceryCategoryGrid({
  items,
  imageForItem,
  onOpen,
}: Props) {
  // First row:
  // [ LARGE - 2 columns ][ BOX ][ BOX ]
  const firstRow = items.slice(0, 3);

  // Everything after first row
  const remainingItems = items.slice(3);

  // Normal 4-card rows after first row
  const remainingRows: HomeContentItem[][] = [];

  for (let index = 0; index < remainingItems.length; index += 4) {
    remainingRows.push(remainingItems.slice(index, index + 4));
  }

  const renderTile = (
    item: HomeContentItem,
    isWide = false,
  ) => {
    const image = imageForItem(item);

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Shop ${item.title}`}
        onPress={() => onOpen(item)}
        className="w-full items-center active:opacity-80"
      >
        {/* CARD */}
        <View
          className="w-full items-center justify-center overflow-hidden rounded-[16px]"
          style={{
            aspectRatio: isWide ? 2 : 1,
            backgroundColor: TILE_BACKGROUND,
          }}
        >
          {image ? (
            <AppImage
              source={{ uri: image }}
              style={{
                width: '92%',
                height: '92%',
              }}
              resizeMode="contain"
              contentPosition="bottom center"
              accessible={false}
            />
          ) : (
            <AppIcon
              icon={ShoppingBasket01Icon}
              size={isWide ? 36 : 28}
              color="#526A36"
            />
          )}
        </View>

        {/* TITLE */}
        <View className="mt-2 h-[42px] w-full items-center justify-start px-0.5">
          <Text
            numberOfLines={2}
            ellipsizeMode="tail"
            className="w-full text-center text-[13px] font-bold leading-[17px] text-[#25272A]"
          >
            {formatCategoryTitle(item.title)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View className="px-5">
      {/* FIRST ROW */}
      {firstRow.length > 0 && (
        <View
          className="flex-row items-start"
          style={{
            gap: GAP,
            marginBottom: 14,
          }}
        >
          {/* LARGE CARD — spans 2 columns */}
          {firstRow[0] && (
            <View style={{ flex: 2 }}>
              {renderTile(firstRow[0], true)}
            </View>
          )}

          {/* SMALL BOX 1 */}
          {firstRow[1] && (
            <View style={{ flex: 1 }}>
              {renderTile(firstRow[1])}
            </View>
          )}

          {/* SMALL BOX 2 */}
          {firstRow[2] && (
            <View style={{ flex: 1 }}>
              {renderTile(firstRow[2])}
            </View>
          )}
        </View>
      )}

      {/* ALL OTHER ROWS — 4 CARDS PER ROW */}
      {remainingRows.map((row, rowIndex) => (
        <View
          key={`row-${rowIndex}`}
          className="flex-row items-start"
          style={{
            marginHorizontal: -GAP / 2,
            marginBottom: 14,
          }}
        >
          {row.map((item) => (
            <View
              key={item.id}
              style={{
                width: '25%',
                paddingHorizontal: GAP / 2,
              }}
            >
              {renderTile(item)}
            </View>
          ))}

          {/* Preserve alignment on incomplete final row */}
          {Array.from(
            {
              length: 4 - row.length,
            },
            (_, index) => (
              <View
                key={`empty-${index}`}
                style={{
                  width: '25%',
                  paddingHorizontal: GAP / 2,
                }}
              />
            ),
          )}
        </View>
      ))}
    </View>
  );
}