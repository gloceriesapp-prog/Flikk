import { StyleSheet, View } from 'react-native';
import { AppImage } from '../../../../components/AppImage';
import { storageUrl } from '../../../../utils/storageUrl';
const artwork = {
  uri: storageUrl('Images/homebg-1.png'),
  width: 1672,
  height: 941,
};

export function RegionalHeaderArtwork() {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.artwork}
    >
      <AppImage
        source={{ uri: artwork.uri }}
        style={StyleSheet.absoluteFill}
        resizeMode="contain"
        priority="high"
        transition={0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  artwork: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    aspectRatio: artwork.width / artwork.height,
    opacity: 0.6,
  },
});
