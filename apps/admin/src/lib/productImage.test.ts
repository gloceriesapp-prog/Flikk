import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { fitProductImage, PRODUCT_IMAGE_HEIGHT, PRODUCT_IMAGE_WIDTH } from './productImage';

// A 400×200 red "product" in the middle of a wide white photo.
const photo = () => sharp({ create: { width: 1600, height: 900, channels: 3, background: '#ffffff' } })
  .composite([{ input: { create: { width: 400, height: 200, channels: 3, background: '#ff0000' } }, left: 600, top: 350 }])
  .jpeg().toBuffer();

test('product photo becomes a 720×810 card with the product centred and whole', async () => {
  const out = await fitProductImage(await photo());
  const meta = await sharp(out).metadata();
  assert.equal(meta.format, 'webp');
  assert.deepEqual([meta.width, meta.height], [PRODUCT_IMAGE_WIDTH, PRODUCT_IMAGE_HEIGHT]);
  const { data, info } = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = (x: number, y: number) => [...data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4)];
  assert.equal(px(5, 5)[3], 0, 'aspect-ratio gaps stay transparent instead of getting a custom colour');
  assert.ok(px(360, 405)[0] > 200 && px(360, 405)[1] < 60, 'product sits in the centre');
  // Trimmed then fitted: the 2:1 product fills the width with no added margin.
  assert.ok(px(60, 405)[0] > 200 && px(60, 405)[1] < 60);
});

test('transparent and plain images still come out 720×810', async () => {
  for (const input of [
    await sharp({ create: { width: 300, height: 300, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer(),
    await sharp({ create: { width: 50, height: 50, channels: 3, background: '#00ff00' } }).png().toBuffer(),
  ]) {
    const meta = await sharp(await fitProductImage(input)).metadata();
    assert.deepEqual([meta.width, meta.height], [PRODUCT_IMAGE_WIDTH, PRODUCT_IMAGE_HEIGHT]);
  }
});

test('prepared 720x810 Canva artwork keeps its edge-to-edge composition', async () => {
  for (const scale of [1, 2]) {
    const width = 720 * scale;
    const height = 810 * scale;
    // A deliberately white frame and a red panel touching the left edge.
    // The old trim/fit/composite path moved that panel in by a 5% margin.
    const input = await sharp({ create: { width, height, channels: 3, background: '#ffffff' } })
      .composite([{ input: { create: { width: 360 * scale, height: 300 * scale, channels: 3, background: '#ff0000' } }, left: 0, top: 200 * scale }])
      .png().toBuffer();
    const output = await fitProductImage(input);
    const { data, info } = await sharp(output).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.deepEqual([info.width, info.height], [720, 810]);
    const panel = (300 * info.width + 5) * 3;
    assert.ok(data[panel] > 220 && data[panel + 1] < 35, 'artwork still touches the left edge');
    const margin = (100 * info.width + 360) * 3;
    assert.ok(data[margin] > 240 && data[margin + 1] > 240, 'designed whitespace is preserved');
  }
});

test('EXIF-rotated prepared artwork retains the displayed portrait ratio', async () => {
  const input = await sharp({ create: { width: 810, height: 720, channels: 3, background: '#ff0000' } })
    .withMetadata({ orientation: 6 }).jpeg().toBuffer();
  const output = await fitProductImage(input);
  const { data, info } = await sharp(output).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([info.width, info.height], [720, 810]);
  assert.ok(data[0] > 220 && data[1] < 35);
});
