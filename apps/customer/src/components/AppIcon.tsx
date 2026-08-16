// Thin wrapper around HugeiconsIcon so every screen gets the same default
// size/stroke/color instead of repeating them at each call site. Pass an
// icon object from '@hugeicons/core-free-icons'.

import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react-native';
import { colors } from '../theme/tokens';

interface Props {
  icon: IconSvgElement;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function AppIcon({ icon, size = 22, color = colors.ink, strokeWidth = 1.8 }: Props) {
  return <HugeiconsIcon icon={icon} size={size} color={color} strokeWidth={strokeWidth} />;
}
