// Thin wrapper around HugeiconsIcon so every screen gets the same default
// size/stroke/color instead of repeating them at each call site. Pass an
// icon object from '@hugeicons/core-free-icons'. Copied from
// apps/customer/src/components/AppIcon.tsx — same pattern, kept in sync by
// hand, see specs/00-foundation/repo-structure.md.

import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react-native';
import { colors } from '../theme/tokens';

interface Props {
  icon: IconSvgElement;
  size?: number;
  color?: string;
  strokeWidth?: number;
  // Every icon here is stroke-only (fill: 'none' at the SVG root, per
  // core-free-icons' own path data — no path in the set carries its own
  // fill), so `color` alone never produces a solid/filled look, only a
  // colored outline. Pass `fill` to actually fill the shape (e.g.
  // BrandFooter's own heart), left unset, the icon stays outline-only.
  fill?: string;
}

export function AppIcon({ icon, size = 22, color = colors.ink, strokeWidth = 1.8, fill }: Props) {
  // HugeiconsIcon defaults fill to 'none' at the SVG root — but only when
  // the `fill` prop is genuinely absent. Passing `fill={undefined}`
  // explicitly (as JSX always does when a prop is spread/set, even to
  // undefined) overrides that default with real `undefined`, which
  // react-native-svg then resolves to solid black on every icon that
  // doesn't pass its own fill. Spreading conditionally keeps the key
  // entirely absent instead of present-but-undefined. Same fix already
  // applied on apps/customer/src/components/AppIcon.tsx's own copy.
  return <HugeiconsIcon icon={icon} size={size} color={color} strokeWidth={strokeWidth} {...(fill ? { fill } : {})} />;
}
