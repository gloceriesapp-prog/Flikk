import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppImage as Image } from '../../../../components/AppImage';

const HEADER_IMAGE =
  'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/update-regional.png';

export function CoconutOilHeaderImage() {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: '100%', aspectRatio: 2172 / 724 }}
    >
      <Image
        source={{ uri: HEADER_IMAGE }}
        className="h-full w-full"
        resizeMode="contain"
      />
      <LinearGradient
        pointerEvents="none"
        colors={['#F3EBD9', '#F3EBD9CC', '#F3EBD94D', '#F3EBD900']}
        locations={[0, 0.2, 0.65, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[StyleSheet.absoluteFill, { width: '52%' }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['#F3EBD900', '#F3EBD966', '#F3EBD9D9', '#F3EBD9', '#F3EBD9']}
        locations={[0, 0.3, 0.6, 0.85, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '62%' }}
      />
    </View>
  );
}
