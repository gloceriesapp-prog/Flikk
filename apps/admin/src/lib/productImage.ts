// Product photos use a 720x810 frame without generated coloured borders.
// Prepared 8:9 artwork keeps its composition. Other photos lose only plain
// outer borders, then fit without cropping; any aspect-ratio gap is transparent.
import sharp from 'sharp';

export const PRODUCT_IMAGE_WIDTH = 720;
export const PRODUCT_IMAGE_HEIGHT = 810;

const open = (input: Buffer) =>
  sharp(input, { limitInputPixels: 20_000_000, animated: false, failOn: 'warning' }).timeout({ seconds: 8 }).rotate();

export async function fitProductImage(input: Buffer): Promise<Buffer> {
  const metadata = await open(input).metadata();
  // Metadata dimensions precede EXIF rotation. Check the displayed dimensions.
  const swapAxes = metadata.orientation != null && metadata.orientation >= 5;
  const width = swapAxes ? metadata.height : metadata.width;
  const height = swapAxes ? metadata.width : metadata.height;
  if (width && height && width * PRODUCT_IMAGE_HEIGHT === height * PRODUCT_IMAGE_WIDTH) {
    // Canva exports already define their margins. Preserve those pixels.
    return open(input).resize(PRODUCT_IMAGE_WIDTH, PRODUCT_IMAGE_HEIGHT).webp({ quality: 82 }).toBuffer();
  }
  const fit = (trim: boolean) =>
    (trim ? open(input).trim({ threshold: 12 }) : open(input))
      .resize(PRODUCT_IMAGE_WIDTH, PRODUCT_IMAGE_HEIGHT, {
        fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: 82 })
      .toBuffer();
  // A single-colour image has nothing to trim. Keep it without adding a fill.
  return fit(true).catch(() => fit(false));
}
