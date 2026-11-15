import type { ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { AppImage } from '../../../components/AppImage';

const SCALLOPS = Array.from({ length: 20 }, (_, index) => index);

export function HomeScallopedPanel({ title, subtitle, backgroundColor, headerImageUrl, headerTextColor, children }: {
  title: string;
  subtitle?: string | null;
  backgroundColor: string;
  headerImageUrl?: string;
  headerTextColor?: string;
  children: ReactNode;
}) {
  return (
    <View className="bg-white pt-7">
      <View className="relative w-full overflow-hidden pb-4" style={{ backgroundColor }}>
        <View pointerEvents="none" className="absolute -top-[9px] left-0 right-0 z-20 flex-row justify-between">
          {SCALLOPS.map((index) => (
            <View key={index} className="h-[18px] w-[18px] rounded-full bg-white" />
          ))}
        </View>

        <View className="relative justify-center px-5 pb-5 pt-8" style={headerImageUrl ? { minHeight: 112 } : undefined}>
          {headerImageUrl && (
            <View
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={styles.headerArtwork}
            >
              <AppImage
                source={{ uri: headerImageUrl }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                contentPosition="right center"
                accessible={false}
              />
              <LinearGradient
                colors={[backgroundColor, backgroundColor, `${backgroundColor}00`]}
                locations={[0, 0.1, 0.65]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={[`${backgroundColor}00`, `${backgroundColor}80`, backgroundColor]}
                locations={[0, 0.55, 1]}
                style={styles.artworkBottomFade}
              />
            </View>
          )}
          <View style={headerImageUrl ? { maxWidth: '56%' } : undefined}>
            <Text
              className="text-[25px] font-extrabold leading-[29px] tracking-[-0.8px]"
              style={{ color: headerTextColor ?? '#190B3D' }}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                className="mt-1 text-[13px] font-semibold tracking-[-0.1px]"
                style={{ color: headerTextColor ?? '#453765' }}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerArtwork: { position: 'absolute', top: 0, right: 0, bottom: 0, width: '60%' },
  artworkBottomFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 30 },
});
