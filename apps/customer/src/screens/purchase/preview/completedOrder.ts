import type { PurchaseOrder } from '../data';

export const COMPLETED_ORDER_PREVIEW_ID = 'purchase-preview-completed';

// Local display data only: never an order UUID or a backend mutation target.
export function createCompletedOrderPreview(): PurchaseOrder {
  const placedAt = new Date();
  placedAt.setDate(placedAt.getDate() - 1);
  placedAt.setHours(18, 20, 0, 0);
  const deliveredAt = new Date(placedAt);
  deliveredAt.setHours(18, 45, 0, 0);
  return {
    id: 'SAMPLE-001',
    orderId: COMPLETED_ORDER_PREVIEW_ID,
    isTrip: false,
    status: 'delivered',
    storeId: 'purchase-preview-store',
    storeName: 'Neighbourhood Grocery',
    items: [
      { productId: 'preview-milk', name: 'Amul Taaza Milk 500ml', quantity: 1, price: 14, imageUri: 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/product-images/5ce767f8-10ab-43fc-a02b-000025030f1c.webp' },
      { productId: 'preview-bananas', name: 'Banana', quantity: 1, price: 45, imageUri: 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/product-images/a37ca3ad-71ab-495e-962e-9bbed47f5a5f.webp' },
      { productId: 'preview-bread', name: 'Britannia Bread 400g', quantity: 1, price: 94, imageUri: 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/product-images/239b9464-9d9e-4f99-8fa2-bd4755fc2d0c.webp' },
      { productId: 'preview-oil', name: 'Fortune Sunflower Oil 1L', quantity: 1, price: 145, imageUri: 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/product-images/559297bb-d2c5-4029-90e7-f9741742076e.webp' },
      { productId: 'preview-cornflakes', name: 'Kellogg’s Corn Flakes 475g', quantity: 1, price: 249, imageUri: 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/product-images/35cb4ae9-ba48-444e-a924-7121d4ecb22a.webp' },
      { productId: 'preview-chips', name: 'Lays Classic Salted 52g', quantity: 1, price: 20, imageUri: 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/product-images/139d002a-8b17-47fc-a3f5-58e3c3f22819.webp' },
      { productId: 'preview-tomatoes', name: 'Tomato', quantity: 1, price: 19, imageUri: 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/product-images/products/dbc4c6ba-8ccd-4b1a-94dd-5196b38333ee.png' },
    ],
    statusLabel: 'Delivered',
    etaLabel: 'Delivered yesterday, 6:45 PM',
    placedAtLabel: 'Yesterday, 6:20 PM',
    placedAtIso: placedAt.toISOString(),
    deliveredAtIso: deliveredAt.toISOString(),
    total: 586,
    avgPrepMinutes: null,
  };
}
