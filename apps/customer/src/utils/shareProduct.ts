// Product share text for the system share sheet (WhatsApp, SMS, ...). There is
// no product web page or product deep link yet, so it names the product, size,
// price and shop and links the Gloceries site.
import { Share } from 'react-native';

export const GLOCERIES_URL = 'https://gloceries.com';

export function productShareMessage(p: { name: string; weight?: string; price: number; storeName?: string }): string {
  // Skip the size when the name already says it ("Amul Tru, 180 ml").
  const size = p.weight && !p.name.toLowerCase().includes(p.weight.toLowerCase()) ? ` (${p.weight})` : '';
  const shop = p.storeName ? ` at ${p.storeName}` : '';
  return `${p.name}${size} for ₹${p.price}${shop}. Order it on Gloceries: ${GLOCERIES_URL}`;
}

export async function shareProduct(p: Parameters<typeof productShareMessage>[0]): Promise<void> {
  try {
    await Share.share({ message: productShareMessage(p) });
  } catch {
    // Share sheet unavailable or dismissed with an error: nothing to do.
  }
}
