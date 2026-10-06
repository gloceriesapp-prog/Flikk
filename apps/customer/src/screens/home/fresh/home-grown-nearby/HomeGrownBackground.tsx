import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, G, Path } from 'react-native-svg';

export function HomeGrownBackground({ color = '#E2E9CE' }: { color?: string } = {}) {
  const original = color === '#E2E9CE';
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <Svg width="100%" height="100%" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="home-grown-sage" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={original ? '#CDD8B6' : color} />
            <Stop offset="0.55" stopColor={original ? '#E7EDCF' : color} />
            <Stop offset="1" stopColor={original ? '#DAE4C2' : color} />
          </LinearGradient>
        </Defs>
        <Rect width="400" height="240" fill="url(#home-grown-sage)" />
        <G transform="translate(332 12) rotate(12)" opacity="0.22">
          <Path
            d="M45 157 C28 111 42 61 62 8 M36 128 C13 95 4 75 2 49 M40 102 C61 83 78 58 83 38"
            stroke="#49643A"
            strokeWidth="2"
            fill="none"
          />
          <Path
            d="M45 86 C20 78 15 56 21 36 C43 45 52 62 45 86 M52 60 C55 33 76 18 91 20 C84 43 68 57 52 60 M38 126 C11 119 2 99 7 83 C29 87 43 106 38 126 M57 36 C37 29 36 9 44 -5 C60 5 65 22 57 36 M45 112 C52 91 72 84 88 89 C78 107 60 118 45 112"
            fill="#547744"
          />
        </G>
      </Svg>
    </View>
  );
}
