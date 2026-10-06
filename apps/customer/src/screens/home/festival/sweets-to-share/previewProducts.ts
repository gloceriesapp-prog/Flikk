import type { Product } from '../../products/types';

export const SWEET_PREVIEW_PRODUCTS: Product[] = [
  { id: 'sweet-preview-laddu', name: 'Besan Laddu Box', weight: '250 g', price: 140 },
  { id: 'sweet-preview-katli', name: 'Kaju Katli Box', weight: '250 g', price: 260 },
  { id: 'sweet-preview-pak', name: 'Mysore Pak', weight: '1 pc', price: 35 },
  { id: 'sweet-preview-assorted', name: 'Assorted Sweet Box', weight: '500 g', price: 320 },
].map((sample) => ({ ...sample, localName: '', rating: 0, ratingCount: '', imageSeed: sample.id, storeName: 'Sample sweet shop' }));
