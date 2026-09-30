import {
  Add01Icon,
  Bookmark02Icon,
  MinusSignIcon,
} from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { RupeePrice } from '../../../components/RupeePrice';

import { AppImage as Image } from '../../../components/AppImage';
import { AppIcon } from '../../../components/AppIcon';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import {
  useCartStore,
  type CartItem,
} from '../../../store/useCartStore';
import { useWishlistStore } from '../../../store/useWishlistStore';
import type { Product } from '../../home/products/types';

const STEPPER_TINT = '#155DFC';
const BLUE = '#155DFC';

function cartItemToProduct(item: CartItem): Product {
  return {
    id: item.id,
    name: item.name,
    localName: '',
    weight: item.weight,
    price: item.price,
    originalPrice: item.originalPrice,
    rating: 0,
    ratingCount: '',
    imageSeed: item.id,
    imageUrl: item.imageUrl,
    storeId: item.storeId,
    storeName: item.storeName,
  };
}

interface Props {
  item: CartItem;
}

export function CartItemRow({ item }: Props) {
  const incrementItem = useCartStore(
    (state) => state.incrementItem,
  );

  const decrementItem = useCartStore(
    (state) => state.decrementItem,
  );

  const isSaved = useWishlistStore(
    (state) => state.isWishlisted(item.id),
  );

  const toggleWishlist = useWishlistStore(
    (state) => state.toggle,
  );

  const lineTotal =
    item.price * item.quantity;

  const hasDiscount =
    item.originalPrice != null &&
    item.originalPrice > item.price;

  const originalLineTotal = hasDiscount
    ? item.originalPrice! * item.quantity
    : null;

  return (
    <View className="flex-row items-start gap-3 py-3.5">

      {/* IMAGE */}
      <View
        className={`
    relative
    h-[68px]
    w-[68px]
    overflow-hidden
    rounded-2xl
    border
    border-gray-100
    ${item.imageUrl
            ? 'bg-[#F3F4F6]'
            : 'bg-white'
          }
  `}
      >
        <Image
          source={{
            uri: item.imageUrl || PLACEHOLDER_IMAGE_URI,
          }}
          className={
            item.imageUrl
              ? 'h-full w-full p-2'
              : 'h-full w-full'
          }
          resizeMode={
            item.imageUrl ? 'contain' : 'cover'
          }
        />
      </View>


      {/* PRODUCT INFO */}
      <View className="min-w-0 flex-1 gap-1 pr-1">

        <Text
          numberOfLines={2}
          className="
            text-[14.5px]
            font-semibold
            leading-[19px]
            text-ink
          "
        >
          {item.name}
        </Text>

        <Text
          className="
            text-[14px]
            font-semibold
            text-ink/50
          "
        >
          {item.weight}
        </Text>

        {/* SAVE FOR LATER */}
        <Pressable
          onPress={() =>
            toggleWishlist(
              cartItemToProduct(item),
            )
          }
          hitSlop={8}
          className="
            mt-0.5
            flex-row
            items-center
            gap-1
            self-start
            active:opacity-60
          "
        >
          <AppIcon
            icon={Bookmark02Icon}
            size={13}
            color={
              isSaved
                ? STEPPER_TINT
                : '#155DFC99'
            }
            fill={
              isSaved
                ? STEPPER_TINT
                : 'transparent'
            }
          />

          <Text className="text-[12px] font-semibold text-[#155DFC]">
            {isSaved
              ? 'Saved for later'
              : 'Save for later'}
          </Text>
        </Pressable>
      </View>


      {/* RIGHT SIDE */}
      <View className="items-end gap-2">

        {/* QUANTITY STEPPER */}
       {/* STEPPER */}
        <View
          className="
            flex-row
            items-center
            rounded-xl
            border
            border-[#155DFC]/25
            bg-[#155DFC]/[0.04]
            p-0.5
          "
        >
          {/* MINUS */}
          <Pressable
            onPress={() =>
              decrementItem(item.id)
            }
            hitSlop={8}
            className="
              h-7
              w-7
              items-center
              justify-center
              rounded-[10px]
              active:bg-[#155DFC]/10
            "
          >
            <AppIcon
              icon={MinusSignIcon}
              size={13}
              color={BLUE}
            />
          </Pressable>

          {/* QUANTITY */}
          <Text
            className="
              min-w-[24px]
              text-center
              text-[13px]
              font-bold
              text-[#155DFC]
            "
          >
            {item.quantity}
          </Text>

          {/* PLUS */}
          <Pressable
            onPress={() =>
              incrementItem(item.id)
            }
            hitSlop={8}
            className="
              h-7
              w-7
              items-center
              justify-center
              rounded-[10px]
              bg-[#155DFC]
              active:bg-[#124FD8]
            "
          >
            <AppIcon
              icon={Add01Icon}
              size={13}
              color="#FFFFFF"
            />
          </Pressable>
        </View>


        {/* PRICE */}
        <View className="items-end">

          {/* CURRENT PRICE */}
          <RupeePrice amount={lineTotal} size={16} />

          {/* MRP */}
          {originalLineTotal != null && (
            <View className="mt-0.5 flex-row items-center gap-1">
              <Text className="text-[10px] font-medium text-ink/40">
                MRP
              </Text>

              <RupeePrice amount={originalLineTotal} size={11} strike color="#101C1066" />
            </View>
          )}
        </View>

      </View>
    </View>
  );
}