import { expect, it } from 'vitest';
import sharp from 'sharp';
import { decodeImage, normalizeImage } from './image.js';
it('rejects oversized, non-canonical and malformed encoded images', () => {
  for (const input of [undefined, '', 'data:image/jpeg;base64,abcd', '%%%%', 'abcd\n', 'a'.repeat(6*1024*1024)]) expect(() => decodeImage(input)).toThrow();
  expect(decodeImage(Buffer.from('test').toString('base64')).toString()).toBe('test');
});
it('rejects invalid image payloads and strips metadata while normalizing', async () => {
  await expect(normalizeImage(Buffer.from('<svg></svg>'),'webp')).rejects.toMatchObject({code:'INVALID_IMAGE'});
  const image=await sharp({create:{width:1000,height:500,channels:3,background:'#ffffff'}}).jpeg().toBuffer();
  const output=await normalizeImage(image,'webp');const meta=await sharp(output).metadata();
  expect(meta.format).toBe('webp');expect(meta.width).toBe(800);expect(meta.exif).toBeUndefined();
});
