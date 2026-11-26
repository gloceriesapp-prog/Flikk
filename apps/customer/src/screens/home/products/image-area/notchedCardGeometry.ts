export const IMAGE_CORNER_RADIUS = 16;
export const NOTCH_GAP = 1.5;
export const NOTCH_FILLET = 8;
export const CART_CONTROL_DURATION = 180;

export function notchedCardMetrics(width: number) {
  const diameter = Math.max(40, width * 0.28);
  const radius = diameter / 2;
  const centerX = width - radius + 4;
  const notch = radius + NOTCH_GAP;
  const dy = radius - 4 - NOTCH_FILLET;
  // Preserve the bottom-left corner and space for the gallery dots on narrow cards.
  const maxExtension = Math.max(0, centerX - Math.sqrt((notch + NOTCH_FILLET) ** 2 - dy ** 2) - IMAGE_CORNER_RADIUS);
  return { diameter, height: width * 4.5 / 4, pillWidth: diameter + Math.min(diameter * 1.25, maxExtension, Math.max(0, width - 31 - diameter)) };
}

/** Clockwise tile outline, with tangent 8px fillets into a concave stadium. */
export function notchedCardPath(width: number, height: number, diameter: number, extension = 0, notch = true) {
  'worklet';
  const r = IMAGE_CORNER_RADIUS;
  const start = `M${r} 0H${width - r}A${r} ${r} 0 0 1 ${width} ${r}`;
  const end = `H${r}A${r} ${r} 0 0 1 0 ${height - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`;
  if (!notch) return `${start}V${height - r}A${r} ${r} 0 0 1 ${width - r} ${height}${end}`;
  const buttonRadius = diameter / 2;
  const R = buttonRadius + NOTCH_GAP;
  const f = NOTCH_FILLET;
  const cx = width - buttonRadius + 4;
  const cy = height - buttonRadius + 4;
  const leftCx = cx - extension;
  const rightDx = width - f - cx;
  const rightY = cy - Math.sqrt((R + f) ** 2 - rightDx ** 2);
  const bottomDy = height - f - cy;
  const bottomX = leftCx - Math.sqrt((R + f) ** 2 - bottomDy ** 2);
  const t = R / (R + f);
  const entryX = cx + rightDx * t;
  const entryY = cy + (rightY - cy) * t;
  const exitX = leftCx + (bottomX - leftCx) * t;
  const exitY = cy + bottomDy * t;
  return `${start}V${rightY}A${f} ${f} 0 0 1 ${entryX} ${entryY}` +
    `A${R} ${R} 0 0 0 ${cx} ${cy - R}H${leftCx}` +
    `A${R} ${R} 0 0 0 ${exitX} ${exitY}A${f} ${f} 0 0 1 ${bottomX} ${height}${end}`;
}
