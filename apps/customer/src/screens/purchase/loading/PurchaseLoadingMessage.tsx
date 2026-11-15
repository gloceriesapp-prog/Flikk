import { View } from 'react-native';
import { ScreenSkeleton } from '../../../components/loading/ScreenSkeleton';

export function PurchaseLoadingMessage() {
  return <View style={{ paddingHorizontal: 20 }}><ScreenSkeleton layout="list" rows={3} label="Loading orders" /></View>;
}
