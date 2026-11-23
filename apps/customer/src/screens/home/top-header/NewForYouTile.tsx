// "NEW for you!" tile beside the search bar. Rotates through the pictures
// admin picks (App content: home.newForYou.image1-4, transparent PNGs shown
// straight on the tile, no box behind them); with none set, through 4 random
// photos of recently added products near the pin (GET /stores/products/catalog
// is newest-first). Tapping opens the full list of recently added products.

import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCopyImage } from '../../../api/appConfig';
import { AppImage, prefetchImages } from '../../../components/AppImage';
import type { AppStackParamList } from '../../../navigation/types';
import { useEverydayEssentials } from '../everyday-essentials/useEverydayEssentials';

const SHOWN = 4;
const ROTATE_MS = 2500;
const TILE_HEIGHT = 52;

// Fisher–Yates over the distinct product photos, then the first 4.
function pickImages(urls: string[]): string[] {
  const pool = [...new Set(urls)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, SHOWN);
}

export function NewForYouTile() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { data: products = [] } = useEverydayEssentials();
  const picked = [
    useCopyImage('home.newForYou.image1', ''),
    useCopyImage('home.newForYou.image2', ''),
    useCopyImage('home.newForYou.image3', ''),
    useCopyImage('home.newForYou.image4', ''),
  ].filter(Boolean);
  const pickedKey = picked.join('|');
  const images = useMemo(
    () => pickedKey ? pickedKey.split('|') : pickImages(products.flatMap((product) => {
      const url = product.imageUrl ?? product.imageUrls?.[0];
      return url ? [url] : [];
    })),
    [pickedKey, products],
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    prefetchImages(images);
    if (images.length < 2) return;
    const timer = setInterval(() => setIndex((current) => (current + 1) % images.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, [images]);

  if (images.length === 0) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="New for you. See recently added products"
      onPress={() => navigation.navigate('HomeSectionCollection', { title: 'New for you', products })}
      style={{ height: TILE_HEIGHT }}
      className="w-[100px] flex-row items-center overflow-hidden rounded-[17px] bg-[#E3F5C6] pl-2.5 active:opacity-80"
    >
      <View>
        <Text className="text-[15px] font-extrabold leading-[16px] text-[#1E5A1E]">NEW</Text>
        <Text className="text-[11px] font-bold leading-[13px] text-[#1E5A1E]">for you!</Text>
      </View>
      {/* A pack peeking up from the tile's bottom edge (clipped a little),
          with a little room on its right. */}
      <AppImage
        source={{ uri: images[index % images.length] }}
        style={{ width: 46, height: 56, marginLeft: 'auto', marginRight: 7, alignSelf: 'flex-end', marginBottom: -12, backgroundColor: 'transparent' }}
        contentPosition="bottom center"
        resizeMode="contain"
        transition={350}
        accessible={false}
      />
    </Pressable>
  );
}
