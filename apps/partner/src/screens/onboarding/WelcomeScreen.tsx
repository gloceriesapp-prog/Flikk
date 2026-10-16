import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

const BRAND_BLUE = '#155dfc';
// Bundled, optimized copy of https://images.gloceries.com/appsui/patner-welcome.png.
// A static asset works on the first offline launch and requires no CDN prefetch
// or network-dependent startup gate. Metro versions it with the app/update.
const WELCOME_ARTWORK = require('../../../assets/partner-welcome.webp');

export function WelcomeScreen() {
  return (
    <View style={styles.screen}>
      <Image
        source={WELCOME_ARTWORK}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="top"
        priority="high"
        transition={0}
        accessibilityLabel="Gloceries Partner — your neighbourhood store, online"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BRAND_BLUE },
});
