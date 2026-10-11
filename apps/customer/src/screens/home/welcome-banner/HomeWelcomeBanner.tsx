import { StyleSheet, View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import { useCopy, useCopyImage } from '../../../api/appConfig';

// Admin App content: home.welcome.imageUrl / home.welcome.label. The new
// Your Shops artwork is the default; admin can still override it from App
// content (that override read is also what keeps home.welcome.imageUrl a
// consumed copy key — see backend copyKeys.test.ts).
const WELCOME_ARTWORK_URI = 'https://images.gloceries.com/appsui/Your%20Shops.png';

export function HomeWelcomeBanner({
  backgroundColor,
}: {
  backgroundColor: string;
}) {
  const uri = useCopyImage('home.welcome.imageUrl', WELCOME_ARTWORK_URI);
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
        source={{ uri }}
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
