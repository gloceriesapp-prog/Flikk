// Cart recommendations keep their existing cards and Explore more picks
// action, with a fixed three-product preview.
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import { ProductCard } from '../../home/products/ProductCard';
import { useEverydayEssentials } from '../../home/everyday-essentials/useEverydayEssentials';
import { ForgotToAddModal } from './ForgotToAddModal';

const GRID_SIZE = 3;
const AVATAR_COUNT = 3;

interface Props {
  cartItemIds: string[];
}

export function ForgotToAddSection({ cartItemIds }: Props) {
  const { data: catalog = [] } = useEverydayEssentials();
  const allCandidates = catalog.filter((product) => !cartItemIds.includes(product.id));
  const gridCandidates = allCandidates.slice(0, GRID_SIZE);
  // Prefer real products the grid above doesn't already show; only reuse
  // the grid's own first few if the candidate pool is too short for
  // distinct ones (still real photos, never a fabricated placeholder set).
  const avatarCandidates =
    allCandidates.length >= GRID_SIZE + AVATAR_COUNT
      ? allCandidates.slice(GRID_SIZE, GRID_SIZE + AVATAR_COUNT)
      : gridCandidates.slice(0, AVATAR_COUNT);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (gridCandidates.length < GRID_SIZE) return null;

  return (
    <View className="overflow-hidden rounded-3xl bg-white shadow-sm shadow-black/5">
      <Text className="px-5 pt-6 pb-3 font-bold tracking-tight text-ink/90" accessibilityRole="header" style={{ fontSize: Platform.OS === 'ios' ? 18 : 17 }}>You might also need</Text>

      <View className="flex-row items-start justify-between px-5 pb-5 pt-3">
        {gridCandidates.map((product) => (
          <ProductCard key={product.id} product={product} widthClassName="w-[31%]" showDiscountBadge />
        ))}
      </View>

      <Pressable
        onPress={() => setIsModalOpen(true)}
        className="mx-5 mb-5 flex-row items-center justify-center gap-2.5 rounded-2xl border border-[#C9DAFE] bg-[#EAF1FF] py-2.5 active:bg-[#D9E6FF]"
      >
        <View className="flex-row">
          {avatarCandidates.map((product, index) => (
            <Image
              key={product.id}
              source={{ uri: product.imageUrl || PLACEHOLDER_IMAGE_URI }}
              className="h-8 w-8 rounded-full border border-gray-200 bg-mist"
              style={index === 0 ? undefined : { marginLeft: -10 }}
              resizeMode="cover"
            />
          ))}
        </View>
        <Text className="text-[14.5px] font-semibold text-[#155DFC]">Explore more picks</Text>
      </Pressable>

      <ForgotToAddModal visible={isModalOpen} cartItemIds={cartItemIds} onClose={() => setIsModalOpen(false)} />
    </View>
  );
}
