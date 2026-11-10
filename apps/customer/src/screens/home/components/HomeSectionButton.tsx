import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowRight02Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { AppImage } from '../../../components/AppImage';
import type { AppStackParamList } from '../../../navigation/types';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import type { Product } from '../products/types';

interface Props {
  label: string;
  items?: { id: string; imageUrl?: string }[];
  onPress: () => void;
  plain?: boolean;
}

export function HomeSectionButton({ label, items = [], onPress, plain = false }: Props) {
  return (
    <View className={plain ? "px-3 pt-3" : "px-5 pb-3 pt-5"}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        className="h-[50px] flex-row items-center justify-center rounded-2xl border border-[#D9E2F5] bg-[#F3F4F6] px-4 active:opacity-85"
      >
        {!plain && items.length > 0 && (
          <View className="mr-2.5 flex-row items-center">
            {items.slice(0, 3).map((item, index) => (
              <View
                key={item.id}
                className={`h-[30px] w-[30px] overflow-hidden rounded-full border border-white bg-[#F8FAFD] ${index > 0 ? '-ml-2' : ''}`}
              >
                <AppImage
                  source={{ uri: item.imageUrl || PLACEHOLDER_IMAGE_URI }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
              </View>
            ))}
          </View>
        )}
        <Text numberOfLines={1} className={plain ? "shrink text-[16px] font-bold text-ink" : "shrink text-[14px] font-bold tracking-[-0.15px] text-[#2F3F83]"}>{label}</Text>
        <View className="ml-1">
          <AppIcon icon={ArrowRight02Icon} size={15} color={plain ? '#111827' : '#2F3F83'} strokeWidth={2.4} />
        </View>
      </Pressable>
    </View>
  );
}

export function HomeProductCollectionButton({
  label, title, products, preview = products, showDiscountBadge, plain,
}: {
  label: string;
  title: string;
  products: Product[];
  preview?: Product[];
  showDiscountBadge?: boolean;
  plain?: boolean;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  if (!products.length) return null;

  function openCollection() {
    // Keep the same products the customer saw first, then add the rest of the feed.
    const unique = new Map<string, Product>();
    for (const product of [...preview, ...products]) {
      if (!unique.has(product.id)) unique.set(product.id, product);
    }
    navigation.navigate('HomeSectionCollection', {
      title, products: [...unique.values()], showDiscountBadge,
    });
  }

  return <HomeSectionButton label={label} items={preview} onPress={openCollection} plain={plain} />;
}
