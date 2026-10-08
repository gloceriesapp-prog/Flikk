import { StyleSheet, View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import { storageUrl } from '../../../utils/storageUrl';
import { useCopy, useCopyImage } from '../../../api/appConfig';

// Admin App content: home.welcome.imageUrl / home.welcome.label.
const WELCOME_ARTWORK_URI = storageUrl('Images/Your%20District,%20Your%20Shop%20tras.png');

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
