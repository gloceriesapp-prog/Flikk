import { beforeEach, expect, it, vi } from 'vitest';
import { Writable, Readable } from 'node:stream';
import type { Request, Response, RequestHandler } from 'express';
const read = vi.hoisted(() => vi.fn());
vi.mock('./publicImages.js', () => ({ readPublicImage: read }));
import { publicDeliveryRouter, publicObjectKey } from './publicDelivery.js';
import { publicImageFallback } from '../../../apps/customer/src/components/media/publicImageFallback';
const file = '807716f3-9083-41d2-a8d6-eafd21465004.webp';
beforeEach(() => { read.mockReset(); });
it('only maps known public immutable R2 image URLs to API recovery', () => {
  const api = 'https://api.example.com';
  expect(publicImageFallback(`https://images.gloceries.com/products/${file}`, api))
    .toBe(`${api}/media/public/products/${file}`);
  for (const url of [`http://images.gloceries.com/products/${file}`, `https://images.gloceries.com.evil/products/${file}`,
    `https://images.gloceries.com/private-documents/${file}`, `https://images.gloceries.com/products/${file}?token=secret`,
    'https://images.gloceries.com/illustrations/location-permission.png', 'file:///tmp/photo.webp'])
    expect(publicImageFallback(url, api)).toBeUndefined();
});
it('rejects private folders, arbitrary keys and traversal', () => {
  expect(publicObjectKey('products', file)).toBe(`products/${file}`);
  for (const [folder, name] of [['rider-documents', file], ['products', '../secret'], ['stores', 'a.jpg']])
    expect(() => publicObjectKey(folder!, name!)).toThrow();
});
async function request(folder = 'products') {
  const bytes: Buffer[] = [];
  const response = new Writable({ write(chunk, _encoding, done) { bytes.push(Buffer.from(chunk)); done(); } });
  const set = vi.fn(); Object.assign(response, { set });
  const next = vi.fn();
  const handler = publicDeliveryRouter.stack.find(layer => layer.route?.path === '/:folder/:file').route.stack.at(-1).handle as RequestHandler;
  await handler({ params: { folder, file } } as unknown as Request, response as unknown as Response, next);
  return { response, bytes: Buffer.concat(bytes), set, next };
}
it('streams the existing public object with immutable image headers', async () => {
  read.mockResolvedValue({ Body: Readable.from(Buffer.from('image')), ContentType: 'image/webp', ContentLength: 5 });
  const result = await request();
  expect(result.bytes.toString()).toBe('image');
  expect(result.set).toHaveBeenCalledWith(expect.objectContaining({ 'Content-Type': 'image/webp', 'Content-Length': '5' }));
  expect(read).toHaveBeenCalledWith(`products/${file}`, expect.any(AbortSignal));
  expect(result.next).not.toHaveBeenCalled();
});
it('rejects invalid routes before storage work', async () => {
  const result = await request('private-documents');
  expect(read).not.toHaveBeenCalled();
  expect(result.next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
});
it('rejects non-image or oversized objects without streaming bytes', async () => {
  for (const metadata of [{ ContentType: 'text/html', ContentLength: 6 },
    { ContentType: 'image/webp', ContentLength: 11 * 1024 * 1024 },
    { ContentType: 'image/webp', ContentLength: -1 }]) {
    const body = Readable.from('secret');
    read.mockResolvedValue({ Body: body, ...metadata });
    const result = await request();
    expect(result.bytes.length).toBe(0);
    expect(body.destroyed).toBe(true);
    expect(result.next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
  }
});
it('returns retryable failures and never sends storage credentials or SDK errors', async () => {
  read.mockRejectedValue(new Error('sensitive upstream details'));
  const result = await request();
  expect(result.next).toHaveBeenCalledWith(expect.objectContaining({ status: 503, message: 'Image unavailable. Please retry.' }));
});
