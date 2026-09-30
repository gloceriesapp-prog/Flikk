import {
  ArrowDown01Icon,
  FavouriteIcon,
} from '@hugeicons/core-free-icons';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type {
  MinRating,
  StoreSort,
} from './StoreFilterSheet';

const ACTIVE_BORDER = '#4C5FE0';
const ACTIVE_TEXT = '#2A3494';

const SORT_LABEL: Record<StoreSort, string> = {
  relevance: 'Sort by',
  rating: 'Top rated',
  fastest: 'Fastest delivery',
};

const RATING_LABEL: Record<MinRating, string> = {
  0: 'Rating',
  4: '4.0+',
  4.5: '4.5+',
};

const CHIP_HEIGHT = 38;
const CHIP_MIN_WIDTH = 84;

interface Props {
  sort: StoreSort;
  minRating: MinRating;
  selectedCategory: string;
  openNowOnly: boolean;
  likedOnly: boolean;
  onOpenFilterSheet: () => void;
  onToggleOpenNow: () => void;
  onToggleLikedOnly: () => void;
}

export function StoreFilterBar({
  sort,
  minRating,
  selectedCategory,
  openNowOnly,
  likedOnly,
  onOpenFilterSheet,
  onToggleOpenNow,
  onToggleLikedOnly,
}: Props) {
  function chipStyle(active: boolean) {
    return {
      height: CHIP_HEIGHT,
      minWidth: CHIP_MIN_WIDTH,

      // Clean 1px border only.
      // No shadows / elevation.
      borderWidth: 1,
      borderColor: active
        ? ACTIVE_BORDER
        : '#E7E7E7',
    };
  }

  return (
    <View
      className="
        mx-1
        rounded-2xl
        py-3
      "
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-3"
      >
        {/* FAVORITE */}
        <Pressable
          onPress={onToggleLikedOnly}
          hitSlop={8}
          className="
            flex-row
            items-center
            justify-center
            gap-1.5
            rounded-2xl
            bg-white
            px-3.5
            active:opacity-70
          "
          style={chipStyle(likedOnly)}
        >
          <AppIcon
            icon={FavouriteIcon}
            size={15}
            color={
              likedOnly
                ? colors.danger
                : colors.ink
            }
            fill={
              likedOnly
                ? colors.danger
                : undefined
            }
            strokeWidth={
              likedOnly ? 0 : 1.8
            }
          />

          <Text
            className="text-[14px] font-semibold"
            style={{
              color: likedOnly
                ? ACTIVE_TEXT
                : colors.ink,
            }}
          >
            Favorite
          </Text>
        </Pressable>


        {/* SORT */}
        <Pressable
          onPress={onOpenFilterSheet}
          className="
            flex-row
            items-center
            justify-center
            gap-1.5
            rounded-2xl
            bg-white
            px-4
            active:opacity-70
          "
          style={chipStyle(
            sort !== 'relevance',
          )}
        >
          <Text
            className="text-[14px] font-semibold"
            style={{
              color:
                sort !== 'relevance'
                  ? ACTIVE_TEXT
                  : colors.ink,
            }}
          >
            {SORT_LABEL[sort]}
          </Text>

          <AppIcon
            icon={ArrowDown01Icon}
            size={12}
            color={
              sort !== 'relevance'
                ? ACTIVE_TEXT
                : `${colors.ink}99`
            }
            strokeWidth={2}
          />
        </Pressable>


        {/* OPEN NOW */}
        <Pressable
          onPress={onToggleOpenNow}
          className="
            items-center
            justify-center
            rounded-2xl
            bg-white
            px-4
            active:opacity-70
          "
          style={chipStyle(openNowOnly)}
        >
          <Text
            className="text-[14px] font-semibold"
            style={{
              color: openNowOnly
                ? ACTIVE_TEXT
                : colors.ink,
            }}
          >
            Open now
          </Text>
        </Pressable>


        {/* CATEGORY */}
        <Pressable
          onPress={onOpenFilterSheet}
          className="
            flex-row
            items-center
            justify-center
            gap-1.5
            rounded-2xl
            bg-white
            px-4
            active:opacity-70
          "
          style={chipStyle(
            selectedCategory !== 'All',
          )}
        >
          <Text
            className="text-[14px] font-semibold"
            style={{
              color:
                selectedCategory !== 'All'
                  ? ACTIVE_TEXT
                  : colors.ink,
            }}
          >
            {selectedCategory === 'All'
              ? 'Category'
              : selectedCategory}
          </Text>

          <AppIcon
            icon={ArrowDown01Icon}
            size={12}
            color={
              selectedCategory !== 'All'
                ? ACTIVE_TEXT
                : `${colors.ink}99`
            }
            strokeWidth={2}
          />
        </Pressable>


        {/* RATING */}
        <Pressable
          onPress={onOpenFilterSheet}
          className="
            flex-row
            items-center
            justify-center
            gap-1.5
            rounded-2xl
            bg-white
            px-4
            active:opacity-70
          "
          style={chipStyle(minRating > 0)}
        >
          <Text
            className="text-[14px] font-semibold"
            style={{
              color:
                minRating > 0
                  ? ACTIVE_TEXT
                  : colors.ink,
            }}
          >
            {RATING_LABEL[minRating]}
          </Text>

          <AppIcon
            icon={ArrowDown01Icon}
            size={12}
            color={
              minRating > 0
                ? ACTIVE_TEXT
                : `${colors.ink}99`
            }
            strokeWidth={2}
          />
        </Pressable>
      </ScrollView>
    </View>
  );
}