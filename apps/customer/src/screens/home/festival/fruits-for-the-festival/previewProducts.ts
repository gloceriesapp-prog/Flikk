import type { Product } from '../../products/types';

export const FESTIVAL_FRUIT_PREVIEW_PRODUCTS: Product[] = [
  { id: 'festival-fruit-preview-banana', name: 'Bananas', weight: '500 g', price: 40 },
  { id: 'festival-fruit-preview-apple', name: 'Apples', weight: '500 g', price: 120 },
  { id: 'festival-fruit-preview-pomegranate', name: 'Pomegranates', weight: '500 g', price: 110 },
  { id: 'festival-fruit-preview-orange', name: 'Oranges', weight: '500 g', price: 60 },
  { id: 'festival-fruit-preview-grapes', name: 'Grapes', weight: '250 g', price: 65 },
  { id: 'festival-fruit-preview-assortment', name: 'Fruit Assortment', weight: '1 kg', price: 180, description: 'Bananas, apples and oranges. Sample assortment.' },
].map((sample) => ({ ...sample, localName: '', rating: 0, ratingCount: '', imageSeed: sample.id, storeName: 'Sample fruit shop' }));
