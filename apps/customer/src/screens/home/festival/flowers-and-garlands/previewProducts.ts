import type { Product } from '../../products/types';
import { flowerPreviewArtwork } from './previewArtwork';

// Development layout samples. Real arrangements use the seller's uploaded
// product photo and pack size; these samples cannot be ordered.
export const FLOWER_PREVIEW_PRODUCTS: Product[] = [
  { id: 'flower-preview-marigold', name: 'Loose Marigold Flowers', weight: '250 g', price: 60 },
  { id: 'flower-preview-garland', name: 'Marigold Garland', weight: '1 metre', price: 120 },
  { id: 'flower-preview-jasmine', name: 'Jasmine Garland', weight: '50 cm', price: 80 },
  { id: 'flower-preview-rose', name: 'Rose Petals', weight: '100 g', price: 50 },
].map((sample, index) => ({
  ...sample,
  localName: '',
  rating: 0,
  ratingCount: '',
  imageSeed: sample.id,
  imageUrl: flowerPreviewArtwork(index === 1 || index === 2, ['#F4A72D', '#E98A25', '#FFFEF3', '#D86B84'][index]),
  storeName: 'Sample seller',
}));
