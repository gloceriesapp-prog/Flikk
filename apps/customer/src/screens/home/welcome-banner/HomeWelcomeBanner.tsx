import { StyleSheet, View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';

const WELCOME_ARTWORK = {
  uri: 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/Your%20District,%20Your%20Shop%20tras.png',
};

export function HomeWelcomeBanner({
  backgroundColor,
}: {
  backgroundColor: string;
}) {
  return (
    <View
      style={{
        width: '100%',
        aspectRatio: 2172 / 724,
        backgroundColor,
      }}
    >
      <Image
        source={WELCOME_ARTWORK}
        style={StyleSheet.absoluteFill}
        resizeMode="contain"
        transition={0}
        priority="high"
        accessible
        accessibilityLabel="Welcome. Shop the stores you already love."
      />
    </View>
  );
}
