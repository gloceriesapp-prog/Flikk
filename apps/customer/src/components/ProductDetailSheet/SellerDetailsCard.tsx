// Seller Details, collapsed to a header row with a chevron. Opened, the
// details show as plain "Label: value" lines: first a short preview that
// fades out, with "Show more +" for the rest and "Show less -" to trim it
// back. The show more/less link only appears when the details are longer
// than the preview.
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconlyChevronDown } from '../icons/IconlyChevronDown';
import type { Product } from '../../screens/home/products/types';

interface Props {
  sellerDetails: NonNullable<Product['sellerDetails']>;
}

const PREVIEW_HEIGHT = 80; // name, FSSAI and the start of the address
const LINK_BLUE = '#155DFC';

function Line({ label, value }: { label: string; value: string }) {
  return (
    <Text selectable className="text-[14px] leading-[21px] text-ink/70">
      {label}: {value}
    </Text>
  );
}

export function SellerDetailsCard({ sellerDetails }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [fullHeight, setFullHeight] = useState(0);
  const isLong = fullHeight > PREVIEW_HEIGHT;
  const clipped = isLong && !showAll;

  const toggleOpen = () => {
    setIsOpen((open) => !open);
    setShowAll(false);
  };

  return (
    <View className="px-4">
      <Pressable onPress={toggleOpen} accessibilityRole="button" accessibilityLabel="Seller details"
        accessibilityState={{ expanded: isOpen }} hitSlop={8} className="flex-row items-center justify-between py-4">
        <View className="flex-1 pr-4">
          <Text className="text-[16px] font-bold text-ink">Seller Details</Text>
          {!isOpen && (
            <Text className="mt-0.5 text-[12px] leading-4 text-muted">FSSAI licence & seller information</Text>
          )}
        </View>
        <View style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}>
          <IconlyChevronDown size={22} color="#101C10" />
        </View>
      </Pressable>

      {isOpen && (
        <View className="pb-4">
          <View style={clipped ? { maxHeight: PREVIEW_HEIGHT, overflow: 'hidden' } : undefined}>
            <View className="gap-1.5" onLayout={(e) => setFullHeight(e.nativeEvent.layout.height)}>
              <Line label="Seller Name" value={sellerDetails.name} />
              <Line label="FSSAI Number" value={sellerDetails.fssaiNumber} />
              <Line label="Address" value={sellerDetails.address} />
            </View>
            {clipped && (
              <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0)', '#FFFFFF']}
                style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 36 }} />
            )}
          </View>
          {isLong && (
            <Pressable onPress={() => setShowAll((all) => !all)} accessibilityRole="button" hitSlop={8} className="mt-3 self-start">
              <Text className="text-[15px] font-semibold" style={{ color: LINK_BLUE }}>
                {showAll ? 'Show less -' : 'Show more +'}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
