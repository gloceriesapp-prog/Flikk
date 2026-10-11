import { StyleSheet, View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import { useCopy } from '../../../api/appConfig';

const WELCOME_ARTWORK_URI =
  'https://images.gloceries.com/appsui/Your%20Shops.png';

export function HomeWelcomeBanner({
  backgroundColor,
}: {
  backgroundColor: string;
}) {
  const label = useCopy('home.welcome.label');

  return (
    <View
      style={{
        width: '100%',
        aspectRatio: 2172 / 724,
        backgroundColor,
      }}
    >
      <Image
        source={{ uri: WELCOME_ARTWORK_URI }}
        style={StyleSheet.absoluteFill}
        resizeMode="contain"
        transition={0}
        priority="high"
        accessible
        accessibilityLabel={label}
      />
    </View>
  );
}