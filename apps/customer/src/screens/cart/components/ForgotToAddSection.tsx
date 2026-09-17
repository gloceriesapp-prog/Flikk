// "Did you forget to add?" — Cart's own last-minute-add nudge, per an
// explicit ask. Real catalog products (useEverydayEssentials, same
// cross-store feed Home's own rows already trust), never ones already
// sitting in the cart (cartItemIds) — a customer being shown something
// they already added would read as a bug, not a nudge. 3-per-row grid
// (same w-[31%] pattern EverydayEssentialsSection.tsx already uses for a
// 3-column layout), capped at 6 (2 rows).
//
// CTA bar at the bottom — inset with its own left/right margin and
// rounded corners (not edge-to-edge like MostShoppedCard.tsx's own CTA
// bar), per an explicit ask. Leads with a stack of 3 small overlapping
// real product-photo avatars (not a fabricated icon) before the label,
// per an explicit ask ("add 3 total card avatar and then the text") —
// same "social proof preview" pattern used elsewhere (a stack of faces/
// thumbnails hinting at more content before naming the action). Avatars
// are drawn from whatever's LEFT in the filtered candidate list after the
// 6-card grid above (real products the grid doesn't already show), falling
// back to the grid's own first 3 if the candidate pool is too short to
// have distinct ones — never fabricated placeholders. Label is "Explore
// more picks", not "See all" — per an explicit ask for wording distinct
// from every other card's own "See all"/"Grab deals"/etc labels in this
// app. Opens ForgotToAddModal.tsx's own full 15-card grid (that file's own
// note on why it's a separate component rather than inlined here).
//
// Renders nothing once there are fewer than 6 real candidates left (a
// near-empty catalog, or a cart that already contains most of it) — same
// "real data only, no half-empty placeholder grid" rule every other Home/
// Cart row already follows.

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import { ProductCard } from '../../home/products/ProductCard';
import { useEverydayEssentials } from '../../home/everyday-essentials/useEverydayEssentials';
import { ForgotToAddModal } from './ForgotToAddModal';

const GRID_SIZE = 6;
const AVATAR_COUNT = 3;
const CARD_WIDTH = 'w-[31%]';

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
      <Text className="px-5 pt-5 text-[15.5px] font-semibold text-ink">Did you forget to add?</Text>

      <View className="flex-row flex-wrap gap-x-2.5 gap-y-4 px-5 pb-5 pt-3">
        {gridCandidates.map((product) => (
          <ProductCard key={product.id} product={product} widthClassName={CARD_WIDTH} showDiscountBadge />
        ))}
      </View>

      <Pressable
        onPress={() => setIsModalOpen(true)}
        className="mx-5 mb-5 flex-row items-center justify-center gap-2.5 rounded-2xl border border-gray-100 bg-gray-50 py-2 active:bg-gray-100"
      >
        <View className="flex-row">
          {avatarCandidates.map((product, index) => (
            <Image
              key={product.id}
              source={{ uri: product.imageUrl || PLACEHOLDER_IMAGE_URI }}
              className="h-8 w-8 rounded-full border-2 border-gray-50 bg-mist"
              style={index === 0 ? undefined : { marginLeft: -10 }}
              resizeMode="cover"
            />
          ))}
        </View>
        <Text className="text-[13.5px] font-bold text-ink">Explore more picks</Text>
      </Pressable>

      <ForgotToAddModal visible={isModalOpen} cartItemIds={cartItemIds} onClose={() => setIsModalOpen(false)} />
    </View>
  );
}
