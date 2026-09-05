import sharp from 'sharp';

// Every upload path (partner.ts's product-photo, storeOnboarding.ts's
// store-photo) normalizes to webp — smaller than jpg/png at equal visual
// quality, and one stored format means every client image-loading path
// (expo-image's contentFit, a future blurhash pass) only ever has to
// handle one case. 800px cap keeps stored originals small — nothing in
// any of the four apps displays a product/store photo anywhere near full
// camera resolution; withoutEnlargement so a smaller source photo is never
// upscaled.
export async function toWebp(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}
