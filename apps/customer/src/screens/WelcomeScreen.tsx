import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AppImage as Image } from '../components/AppImage';

// Bundle the artwork so the brief welcome screen never waits for a download.
const WELCOME_IMAGE = require('../../assets/welcome-welcome.png');

export function WelcomeScreen() {
  return (
    <View className="flex-1 bg-[#155DFC]">
      <StatusBar hidden={false} style="light" />
      <Image
        source={WELCOME_IMAGE}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        transition={0}
        accessibilityLabel="Welcome to Gloceries"
      />
    </View>
  );
}
