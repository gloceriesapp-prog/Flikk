'use client';

// The "Text headline" background for a premium photo: the admin's words in
// capitals, as large as fits, centred near the top of a 720x810 card, like a
// poster. The product is placed over its lower part by Photoroom (the server
// sends this as a static background, lib/photoroom.ts TEXT_PADDING). Drawn
// here with the app's Gilroy Black so the server needs no fonts.

const FRAME = { width: 720, height: 810 };
const TEXT_BOX = { top: 56, width: 640, height: 290 };
const LINE_HEIGHT = 0.9;
let fontReady: Promise<void> | null = null;

function loadFont(): Promise<void> {
  fontReady ??= new FontFace('GilroyHeadline', 'url(/fonts/Gilroy-Black.ttf)').load().then((face) => { document.fonts.add(face); });
  return fontReady;
}

export async function renderHeadline(canvas: HTMLCanvasElement, lines: string[], background: string, color: string): Promise<void> {
  await loadFont();
  canvas.width = FRAME.width;
  canvas.height = FRAME.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, FRAME.width, FRAME.height);
  if (!lines.length) return;
  // Largest size where the widest line fits the width and all lines the height.
  ctx.font = '100px GilroyHeadline';
  const widest = Math.max(...lines.map((line) => ctx.measureText(line).width));
  const size = Math.floor(Math.min((100 * TEXT_BOX.width) / widest, TEXT_BOX.height / (lines.length * LINE_HEIGHT), 220));
  ctx.font = `${size}px GilroyHeadline`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  // Cap height of Gilroy is about 0.7 of the size: start the first line so
  // the block's top sits at TEXT_BOX.top.
  lines.forEach((line, i) => ctx.fillText(line, FRAME.width / 2, TEXT_BOX.top + size * 0.7 + i * size * LINE_HEIGHT));
}
