// Scalloped "seal" badge (8 petal circles behind a center circle) —
// approximates the blob/flower checkmark badge from the reference designs
// using plain Views (trig-positioned circles), not an image asset or an
// SVG library. Used by ReceiptScreen's own header.

import { Tick02Icon } from '@hugeicons/core-free-icons';
import { View } from 'react-native';
import { AppIcon } from './AppIcon';

const PETAL_COUNT = 8;

interface Props {
  size?: number;
  color?: string;
}

export function SuccessSeal({ size = 96, color = '#2E9E77' }: Props) {
  const center = size / 2;
  const petalRadius = size * 0.22;
  const petalDistance = size * 0.32;

  return (
    <View style={{ width: size, height: size }}>
      {Array.from({ length: PETAL_COUNT }).map((_, i) => {
        const angle = (i * (360 / PETAL_COUNT) * Math.PI) / 180;
        const left = center + petalDistance * Math.cos(angle) - petalRadius;
        const top = center + petalDistance * Math.sin(angle) - petalRadius;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left,
              top,
              width: petalRadius * 2,
              height: petalRadius * 2,
              borderRadius: petalRadius,
              backgroundColor: color,
            }}
          />
        );
      })}

      <View
        style={{
          position: 'absolute',
          left: size * 0.09,
          top: size * 0.09,
          width: size * 0.82,
          height: size * 0.82,
          borderRadius: size * 0.41,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppIcon icon={Tick02Icon} size={size * 0.4} color="#FFFFFF" />
      </View>
    </View>
  );
}
