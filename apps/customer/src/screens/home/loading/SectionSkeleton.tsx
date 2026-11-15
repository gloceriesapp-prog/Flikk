import { View } from 'react-native';
import { ScreenSkeleton } from '../../../components/loading/ScreenSkeleton';

export function SectionSkeleton({ height = 160 }: { height?: number }) {
  return <View style={{ paddingHorizontal: 20, paddingTop: 16, height, overflow: 'hidden' }}>
    <ScreenSkeleton rows={1} />
  </View>;
}
