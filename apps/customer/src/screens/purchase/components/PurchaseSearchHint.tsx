// Keep the empty input's hint stable so iOS never shows clipped lines
// between animated phrases. The real input owns the accessibility label.
import { Text, View } from 'react-native';
import { colors } from '../../../theme/tokens';

export function PurchaseSearchHint() {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center' }}
    >
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{ includeFontPadding: false, fontSize: 15, color: `${colors.ink}66` }}
      >
        Search by item or shop
      </Text>
    </View>
  );
}
