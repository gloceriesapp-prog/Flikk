import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { AppImage } from '../../../../components/AppImage';

// Decorative scalloped paper edge, matching the supplied reference.
const edge = `M0 3 ${Array.from({ length: 20 }, (_, index) =>
  `Q${index * 20 + 10} 10 ${(index + 1) * 20} 3`).join(' ')} L400 10 L0 10 Z`;

export function MeatCategoryBanner() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top, backgroundColor: '#D37A35' }}>
      <AppImage
        source={require('../../../../../assets/illustrations/meat-section-banner.png')}
        style={{ width: '100%', aspectRatio: 1672 / 941 }}
        contentFit="cover"
        priority="high"
        transition={0}
        accessible={false}
      />
      <Svg pointerEvents="none" width="100%" height={8} viewBox="0 0 400 10"
        preserveAspectRatio="none" style={styles.edge} accessible={false}>
        <Path d={edge} fill="#FFFFFF" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  edge: { position: 'absolute', bottom: -0.5, left: 0, right: 0 },
});
