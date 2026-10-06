import type { Product } from '../../products/types';

// Layout samples only: no store identity, and never added to the cart.
const samples = [
  { key: 'diyas', name: 'Clay Diyas', weight: '6 pcs', price: 60 },
  { key: 'wicks', name: 'Cotton Wicks', weight: '100 pcs', price: 25 },
  { key: 'incense', name: 'Incense Sticks', weight: '1 pack', price: 45 },
  { key: 'kumkum', name: 'Puja Kumkum', weight: '25 g', price: 30 },
  { key: 'turmeric', name: 'Turmeric Powder', weight: '100 g', price: 35 },
  { key: 'camphor', name: 'Puja Camphor', weight: '25 g', price: 50 },
] as const;

export const PUJA_PREVIEW_PRODUCTS: Product[] = samples.map(({ key, ...sample }) => ({
  ...sample,
  id: `puja-preview-${key}`,
  localName: '',
  rating: 0,
  ratingCount: '',
  imageSeed: key,
  bgColor: '#FFF1D6',
  // Existing festival artwork illustrates the samples, not actual packaging.
  imageUrl: 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/puja.png',
  storeName: 'Sample seller',
}));
