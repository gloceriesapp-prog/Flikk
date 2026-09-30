import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  ArrowRight01Icon,
  Fire03Icon,
} from '@hugeicons/core-free-icons';

import { AppIcon } from '../../../components/AppIcon';
import { useStorePopularProducts } from './useStorePopularProducts';
import { PopularProductRow } from './PopularProductRow';
import type { AppStackParamList } from '../../../navigation/types';

const ACCENT = '#155DFC';

interface Props {
  storeId: string;
  storeName: string;
}

export function PopularStorePanel({
  storeId,
  storeName,
}: Props) {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<AppStackParamList>
    >();

  const {
    data: products = [],
  } = useStorePopularProducts(storeId);

  if (products.length === 0) {
    return null;
  }

  const openStore = () => {
    navigation.navigate('StoreDetail', {
      storeId,
      storeName,
    });
  };

  return (
    <View
      className="
        w-[308px]
        overflow-hidden
         rounded-[28px]
      bg-white
      shadow-sm
      shadow-black/[0.05]
      "
    >
      {/* HEADER */}
      <Pressable
        onPress={openStore}
        className="
          px-4
          pb-4
          pt-4
          active:bg-[#FAFAFA]
        "
      >
        <View className="flex-row items-center justify-between">
          <View
            className="
              flex-row
              items-center
              gap-1.5
              rounded-full
              bg-[#155DFC]/[0.08]
              px-2.5
              py-1.5
            "
          >
            <AppIcon
              icon={Fire03Icon}
              size={13}
              color={ACCENT}
              strokeWidth={2}
            />

            <Text
              className="
                text-[12px]
                font-semibold
                text-[#155DFC]
              "
            >
              Popular
            </Text>
          </View>

          <View
            className="
              h-9
              w-9
              items-center
              justify-center
              rounded-full
              bg-[#F7F7F7]
            "
          >
            <AppIcon
              icon={ArrowRight01Icon}
              size={16}
              color="#111111"
              strokeWidth={2}
            />
          </View>
        </View>

        <Text
          numberOfLines={1}
          className="
            mt-3.5
            text-[17px]
            font-semibold
            tracking-[-0.35px]
            text-[#111111]
          "
        >
          {storeName}
        </Text>

        <Text
          className="
            mt-1
            text-[12px]
            font-semibold
            text-black/45
          "
        >
          Discounted picks from this store
        </Text>
      </Pressable>

      {/* PRODUCT AREA */}
      <View className="px-2.5 pb-2.5">
        <View
          className="
            overflow-hidden
            rounded-2xl
            bg-[#F7F7F7]
          "
        >
          {products.map((product, index) => (
            <View
              key={product.id}
              className={
                index === products.length - 1
                  ? ''
                  : 'border-b border-black/[0.05]'
              }
            >
              <PopularProductRow product={product} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}