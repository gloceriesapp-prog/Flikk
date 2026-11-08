import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { cleanBandedPhoto, fitProductImage, PRODUCT_IMAGE_HEIGHT, PRODUCT_IMAGE_WIDTH } from './productImage';

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

// A square scene photo padded to 720x810 with a solid olive band (what an
// older upload step saved).
const bandedSquarePhoto = async () => {
  const scene = await sharp({ create: { width: 648, height: 648, channels: 3, background: '#d9d4c7' } })
    .composite([{ input: { create: { width: 200, height: 300, channels: 3, background: '#2045c8' } }, left: 224, top: 174 }])
    .png().toBuffer();
  return sharp({ create: { width: 720, height: 810, channels: 3, background: '#3f402e' } })
    .composite([{ input: scene, left: 36, top: 81 }]).png().toBuffer();
};
const olive = (p: number[]) => Math.abs(p[0] - 0x3f) < 20 && Math.abs(p[1] - 0x40) < 20 && Math.abs(p[2] - 0x2e) < 20;

test('a near card-shaped photo fills the card edge to edge, no band', async () => {
  const out = await fitProductImage(await bandedSquarePhoto(), { removeBand: true });
  const { data, info } = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([info.width, info.height], [720, 810]);
  const px = (x: number, y: number) => [...data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4)];
  for (const [x, y] of [[2, 2], [717, 2], [2, 807], [717, 807], [360, 3], [3, 405]]) {
    assert.ok(!olive(px(x, y)), `no band at ${x},${y}`);
    assert.equal(px(x, y)[3], 255, `opaque photo at ${x},${y}`);
  }
  assert.ok(px(360, 405)[2] > 150, 'product still in the centre');
});

test('without removeBand a 720x810 file is still left exactly as designed', async () => {
  const out = await fitProductImage(await bandedSquarePhoto());
  const { data } = await sharp(out).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.ok(olive([data[0], data[1], data[2]]), 'prepared artwork untouched');
});

test('a square scene photo uploaded as is fills the card too', async () => {
  // A smooth colour gradient: no plain edge to trim, like a real photo.
  const size = 1000;
  const pixels = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 3;
    pixels[i] = Math.round((x / size) * 255); pixels[i + 1] = Math.round((y / size) * 255); pixels[i + 2] = 128;
  }
  const input = await sharp(pixels, { raw: { width: size, height: size, channels: 3 } }).jpeg().toBuffer();
  const { data, info } = await sharp(await fitProductImage(input)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([info.width, info.height], [720, 810]);
  assert.equal(data[3], 255, 'corner is photo, not a transparent gap');
});

test('a product on a plain background is never cropped', async () => {
  // A 300x400 box on white: near card shape, but it must be shown whole.
  const input = await sharp({ create: { width: 1000, height: 1000, channels: 3, background: '#ffffff' } })
    .composite([{ input: { create: { width: 300, height: 400, channels: 3, background: '#aa2222' } }, left: 350, top: 300 }])
    .jpeg().toBuffer();
  const { data, info } = await sharp(await fitProductImage(input)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = (x: number, y: number) => [...data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4)];
  // A 3:4 box is taller than the card, so it is shown whole with side gaps.
  assert.equal(px(2, 405)[3], 0, 'side gap stays transparent: box shown whole, not cropped');
  assert.ok(px(360, 2)[0] > 150 && px(360, 2)[3] === 255, 'box top is kept, not cropped off');
});

test('clean-up: a banded scene is fixed; a photo without a band, or a coloured studio background, is left alone', async () => {
  assert.ok(await cleanBandedPhoto(await bandedSquarePhoto()), 'banded scene photo is cleaned');
  const studio = await sharp({ create: { width: 720, height: 810, channels: 3, background: '#d72018' } })
    .composite([{ input: { create: { width: 160, height: 520, channels: 3, background: '#3a1a10' } }, left: 280, top: 150 }]).png().toBuffer();
  assert.equal(await cleanBandedPhoto(studio), null, 'red studio background is kept');
  const size = 720;
  const px = Buffer.alloc(size * 810 * 3);
  for (let i = 0; i < px.length; i++) px[i] = (i * 7) % 251;
  assert.equal(await cleanBandedPhoto(await sharp(px, { raw: { width: size, height: 810, channels: 3 } }).png().toBuffer()), null, 'no band, no change');
});
