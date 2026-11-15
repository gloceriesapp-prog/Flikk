import { View } from 'react-native';
import { ScreenSkeleton } from '../../../components/loading/ScreenSkeleton';

export function HomeLoader() {
  return <View className="flex-1 bg-white px-5 pt-safe" testID="home-loading-skeleton">
    <ScreenSkeleton layout="list" rows={1} label="Loading delivery area" />
    <ScreenSkeleton layout="categories" rows={1} />
    <ScreenSkeleton label="Loading home products" />
  </View>;
}
