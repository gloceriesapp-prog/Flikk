// Local UI preview only. No database writes or real credentials are involved.
import { DEMO_DATA_ENABLED } from './demoMode';
import type { Me } from './authApi';
import type { Store, TodayStats, PartnerReview } from './partnerApi';
import { DEMO_ORDERS } from './demoOrders';
import { DEMO_PRODUCTS } from './demoProducts';
import { DEMO_PAYOUTS } from './demoPayouts';

export const DEMO_ME: Me = {
  role: 'store_owner', is_approved: true, has_store: true,
  application_submitted: true, is_rejected: false, rejection_reason: null,
  phone: '+910000000000', name: 'Demo Partner',
};
const store: Store = {
  id: 'demo-store', name: 'Coastal Fresh Mart', category: 'Kirana & Grocery',
  is_active: true, access_role: 'owner', district: 'Udupi', photo_url: null,
  open_time: '08:00', close_time: '22:00', avg_prep_minutes: 8,
  payout_method: 'upi', payout_upi_id: 'preview@example', payout_upi_verified_name: 'Demo Partner',
  payout_bank_name: null, payout_bank_account_number: null, payout_bank_ifsc: null,
  owner_name: 'Demo Partner', gst_number: null, shop_establishment_number: null,
  fssai_number: '12345678901234', pan_number: 'ABCDE1234F', phone: '+910000000000',
};
const reviews: PartnerReview[] = [
  { id: 'demo-review-1', rating: 5, comment: 'Fresh vegetables and neatly packed essentials. Thank you!', created_at: new Date().toISOString(), owner_reply: null, owner_replied_at: null, users: { name: 'Sample customer' }, orders: { order_number: 'FLK-1042' } },
  { id: 'demo-review-2', rating: 4, comment: 'Good selection and quick preparation.', created_at: new Date(Date.now() - 86400000).toISOString(), owner_reply: 'Thank you for shopping with us!', owner_replied_at: new Date().toISOString(), users: { name: 'Sample customer' }, orders: { order_number: 'FLK-1040' } },
];

const deletedDemoProducts = new Set<string>();

export function demoRequest(path: string, method: string): unknown {
  if (!DEMO_DATA_ENABLED) throw new Error('Local preview is disabled.');
  const deleteMatch = /^\/partner\/products\/(demo-product-\d+)$/.exec(path);
  if (method === 'DELETE' && deleteMatch && DEMO_PRODUCTS.some(p => p.id === deleteMatch[1])) {
    deletedDemoProducts.add(deleteMatch[1]);
    return undefined;
  }
  const products = DEMO_PRODUCTS.filter(p => !deletedDemoProducts.has(p.id));
  // Fail closed: unsupported operations never fall through to the real API.
  if (method !== 'GET') throw new Error('Preview only — changes are not saved.');
  const url = new URL(path, 'http://preview.local');
  switch (url.pathname) {
    case '/auth/me': return { ...DEMO_ME };
    case '/partner/store': return { ...store };
    case '/partner/store-categories': return [{ name: store.category, requires_drug_license: false }, { name: 'Supermarket', requires_drug_license: false }];
    case '/partner/orders': return { items: structuredClone(DEMO_ORDERS), nextCursor: null };
    case '/partner/products/overview': {
      const live = products.filter(p => p.approval_status === 'approved');
      const pending = products.filter(p => p.approval_status === 'pending');
      const out = products.filter(p => !p.is_in_stock).sort((a, b) => a.name.localeCompare(b.name));
      const low = products.filter(p => p.stock_tracking_enabled && p.is_in_stock && (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) < 5).sort((a, b) => (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0));
      return { total: products.length, live: live.length, notLive: products.length - live.length - pending.length,
        pending: pending.length, outOfStock: out.length, runningLow: low.length,
        outOfStockNames: out.slice(0, 2).map(p => p.name), pendingNames: pending.slice(0, 2).map(p => p.name),
        lowStockExample: low[0] ? { name: low[0].name, stock_quantity: low[0].stock_quantity } : null };
    }
    case '/partner/products': {
      const search = (url.searchParams.get('q') ?? '').toLowerCase();
      const stock = url.searchParams.get('stock');
      const items = products.filter(p => (p.name.toLowerCase().includes(search) || p.category.toLowerCase().includes(search)) && (!stock || stock === 'all' || (stock === 'pending' ? p.approval_status === 'pending' : stock === 'low_stock' ? p.stock_tracking_enabled && p.is_in_stock && (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) < 5 : stock === 'in_stock' ? p.is_in_stock : p.stock_status === stock)));
      return { items: structuredClone(items), nextCursor: null };
    }
    case '/partner/stats/today': {
      const today = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
      const orders = DEMO_ORDERS.filter(o => new Date(o.placed_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) === today);
      return { ordersToday: orders.length, pendingToday: orders.filter(o => o.status === 'placed').length,
        earningToday: orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.item_total - o.commission_amount, 0) } satisfies TodayStats;
    }
    case '/partner/payouts': return { items: structuredClone(DEMO_PAYOUTS), nextCursor: null };
    case '/partner/commission': return { commissionRate: 0.04, isStoreOverride: false, capPerOrder: 30, categoryRates: [
      { category: 'Dairy, Bread & Eggs', commissionRate: 0 }, { category: 'Vegetables & Fruits', commissionRate: 0.02 },
      { category: 'Meat, Eggs & Fish', commissionRate: 0.02 }, { category: 'Snacks & Munchies', commissionRate: 0.04 },
      { category: 'Personal Care', commissionRate: 0.08 }] };
    case '/partner/reviews': return structuredClone(reviews);
    default: throw new Error('This action is unavailable in the local preview.');
  }
}
