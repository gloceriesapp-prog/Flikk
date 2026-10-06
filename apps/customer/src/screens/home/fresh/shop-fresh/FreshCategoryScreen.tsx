import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../../navigation/types';
import { GroceryCollectionScreen } from '../../groceries/components/GroceryCollectionScreen';
import { FRESH_CATEGORIES } from './data';

type Props = NativeStackScreenProps<AppStackParamList, 'FreshCategory'>;

export function FreshCategoryScreen({ navigation, route }: Props) {
  const category = FRESH_CATEGORIES.find((item) => item.id === route.params.categoryId);
  if (!category) {
    return <View className="flex-1 items-center justify-center gap-4 bg-white px-6"><Text className="text-center text-ink/60">This fresh category is unavailable.</Text><Pressable accessibilityRole="button" onPress={() => navigation.goBack()} className="min-h-11 justify-center px-5"><Text className="font-semibold text-[#155DFC]">Go back</Text></Pressable></View>;
  }
  return <GroceryCollectionScreen title={category.title} groups={category.groups} />;
}
