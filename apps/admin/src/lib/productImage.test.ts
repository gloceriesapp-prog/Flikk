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
  const { data, info } = await sharp(out).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = (x: number, y: number) => [...data.subarray((y * info.width + x) * 3, (y * info.width + x) * 3 + 3)];
  assert.ok(px(5, 5).every((c) => c > 245), 'corner keeps the photo background');
  assert.ok(px(360, 405)[0] > 200 && px(360, 405)[1] < 60, 'product sits in the centre');
  // Trimmed then fitted: the 2:1 product fills the width, minus the margin.
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
