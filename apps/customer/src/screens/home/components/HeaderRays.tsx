// Diagonal light-ray overlay for HomeHeader's own gradient background — per
// an explicit reference image (a green header with soft diagonal light
// bands cutting across it). Purely decorative, pointerEvents="none" so it
// never intercepts taps meant for the header content sitting above it in
// the stack.
//
// Each "ray" is its own LinearGradient strip (transparent -> translucent
// white -> transparent), not a plain semi-opaque rotated rectangle — a flat
// tint would read as a stripe, the soft-edged fade is what actually reads
// as *light* crossing the surface. Rotated via transform, sized well past
// the header's own bounds in every direction so a ray still fully covers
// the corner-to-corner diagonal regardless of the header's actual height
// (which varies — collapsed vs. expanded, category tabs shown or not);
// HomeHeader's own `overflow-hidden` on the gradient container clips
// everything back down to the real header shape.

import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Ray {
  left: number; // % across the header width, before rotation
  width: number;
  opacity: number;
}

// Three rays, staggered — a single ray reads as a hard diagonal cut, three
// at slightly different positions/widths/opacities is what reads as soft
// ambient light rather than a graphic stripe.
const RAYS: Ray[] = [
  { left: -10, width: 70, opacity: 0.16 },
  { left: 35, width: 55, opacity: 0.22 },
  { left: 78, width: 45, opacity: 0.13 },
];

export function HeaderRays() {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {RAYS.map((ray, i) => (
        <LinearGradient
          key={i}
          colors={['rgba(255,255,255,0)', `rgba(255,255,255,${ray.opacity})`, 'rgba(255,255,255,0)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            position: 'absolute',
            top: -80,
            left: `${ray.left}%`,
            width: `${ray.width}%`,
            height: '260%',
            transform: [{ rotate: '22deg' }],
          }}
        />
      ))}
    </View>
  );
}
