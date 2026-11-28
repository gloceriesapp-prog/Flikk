// Stand-in product photos for cards that have none yet (schedule mode, or a
// card whose products have no photo). Picked by card id, so each card keeps
// the same pair. ponytail: fixed list; replaced by real per-card photos from
// the server / admin "Pick 2 products".
const IMG = (id: string) => `https://images.gloceries.com/products/${id}.webp`;
const PHOTOS = [
  '9da2eadc-3110-4c61-959b-2b36bda175ac', '9848aeaa-51e0-4982-937e-8f3ce0799b03', 'c52e9e8a-262f-4cbe-ae51-9fb34b8b5a4c',
  '433025b2-66c4-42b7-a194-0510abc87113', '098919e6-348d-4ced-81c6-ff6e81d80c34', '87b2e4d4-b080-4e6c-8216-8486aada4d67',
  'f13cd75e-d20a-4813-aa28-909882bd94cc', '59080a64-95cc-4e6b-9e05-060a247793a7',
].map(IMG);

export function photosFor(id: string, urls: string[], count = 2): string[] {
  if (urls.length) return urls.slice(0, count);
  const seed = [...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return Array.from({ length: count }, (_, i) => PHOTOS[(seed + i * 3) % PHOTOS.length]!);
}
