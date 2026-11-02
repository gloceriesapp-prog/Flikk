import { useContext, useEffect, useLayoutEffect, useState } from 'react';
import { StartupAppearanceContext } from './startupAppearance';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

// Start the viewing interval only after the bundled image is actually displayed.
// Local state restores in parallel, without a CDN request or fade-in.
export function StartupWelcome({ onFinished }: { onFinished: () => void }) {
  const [displayed, setDisplayed] = useState(false);
  useEffect(() => {
    if (!displayed) return;
    const timer = setTimeout(onFinished, 3500);
    return () => clearTimeout(timer);
  }, [displayed, onFinished]);
  const setStartupVisible = useContext(StartupAppearanceContext);
  useLayoutEffect(() => {
    setStartupVisible?.(true);
    return () => setStartupVisible?.(false);
  }, [setStartupVisible]);
  return (
    <View style={styles.container} accessibilityLabel="Welcome to Gloceries">
      <StatusBar style="light" hidden={false} />
      <Image
        testID="startup-welcome-artwork"
        source={require('../../assets/customer-welcome.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        priority="high"
        transition={0}
        onDisplay={() => setDisplayed(true)}
        onError={onFinished}
        accessible={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0055FF' },
});
