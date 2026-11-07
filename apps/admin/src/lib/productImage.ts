// Product photos -> the customer card's 720×810 frame. Prepared artwork
// already in this aspect ratio is resized only, preserving the composition.
// For other shapes the background stays as photographed: plain borders are trimmed, the product is scaled to fit
// with a small margin, and the canvas is filled with the photo's own corner
// colour (transparent stays transparent). Nothing is cropped off the product.
import sharp from 'sharp';

export const PRODUCT_IMAGE_WIDTH = 720;
export const PRODUCT_IMAGE_HEIGHT = 810;
const MARGIN = 0.05;

const open = (input: Buffer) =>
  sharp(input, { limitInputPixels: 20_000_000, animated: false, failOn: 'warning' }).timeout({ seconds: 8 }).rotate();

export async function fitProductImage(input: Buffer): Promise<Buffer> {
  const metadata = await open(input).metadata();
  // Metadata dimensions precede EXIF rotation. Check the displayed dimensions.
  const swapAxes = metadata.orientation != null && metadata.orientation >= 5;
  const width = swapAxes ? metadata.height : metadata.width;
  const height = swapAxes ? metadata.width : metadata.height;
  if (width && height && width * PRODUCT_IMAGE_HEIGHT === height * PRODUCT_IMAGE_WIDTH) {
    // Canva exports (720x810, 1440x1620, etc.) already define their margins.
    // Do not trim or add a corner-colour border to a finished composition.
    return open(input).resize(PRODUCT_IMAGE_WIDTH, PRODUCT_IMAGE_HEIGHT).webp({ quality: 82 }).toBuffer();
  }
  const { data } = await open(input).ensureAlpha().extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
  const background = { r: data[0], g: data[1], b: data[2], alpha: data[3] / 255 };
  const fit = (trim: boolean) =>
    (trim ? open(input).trim({ threshold: 12 }) : open(input))
      .resize(Math.round(PRODUCT_IMAGE_WIDTH * (1 - 2 * MARGIN)), Math.round(PRODUCT_IMAGE_HEIGHT * (1 - 2 * MARGIN)), { fit: 'inside' })
      .png()
      .toBuffer();
  // A photo that is all one colour has nothing to trim; sharp throws then.
  const product = await fit(true).catch(() => fit(false));
  return sharp({ create: { width: PRODUCT_IMAGE_WIDTH, height: PRODUCT_IMAGE_HEIGHT, channels: 4, background } })
    .composite([{ input: product, gravity: 'centre' }])
    .webp({ quality: 82 })
    .toBuffer();
}
