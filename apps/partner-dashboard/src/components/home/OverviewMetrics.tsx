import Link from 'next/link';
import { ArrowUpRight, Banknote, ShoppingBag, Package, Wallet, Star, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { DEMO_DATA_ENABLED } from '@/lib/demoMode';
import { formatInr } from '@/lib/format';
import type { PartnerOrder, PartnerProduct, TodayStats, Payout, PartnerReview } from '@/lib/partnerApi';
import { isStoreToday, outOfStockCount, sumTotals } from './dashboardData';

type Metric = { label: string; value: string; badge: string; detail: string; href: string; icon: LucideIcon; tone: 'green' | 'red' | 'amber' | 'neutral' };
const tones = {
  green: 'bg-emerald-50 text-emerald-700',
  red: 'bg-red-50 text-red-700',
  amber: 'bg-amber-50 text-amber-700',
  neutral: 'bg-slate-100 text-slate-600',
};
const dateLabel = (date: string) => new Date(date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });

export function OverviewMetrics({ orders, products, today, payouts, reviews, now }: {
  orders: PartnerOrder[]; products: PartnerProduct[]; today: TodayStats | null | undefined;
  payouts: Payout[] | null | undefined; reviews: PartnerReview[] | null | undefined; now: number;
}) {
  const placedToday = orders.filter(order => isStoreToday(order.placed_at, now));
  const billed = placedToday.filter(order => order.status !== 'cancelled');
  const sales = sumTotals(billed);
  const outOfStock = outOfStockCount(products);
  const live = products.filter(product => product.approval_status === 'approved' && product.is_in_stock && product.stock_status !== 'out_of_stock').length;
  const pending = products.filter(product => product.approval_status === 'pending' || product.pending_changes || product.pending_image_url).length;
  const payout = payouts ? [...payouts].sort((a, b) => b.week_end.localeCompare(a.week_end)).find(item => item.status !== 'paid') ?? [...payouts].sort((a, b) => b.week_end.localeCompare(a.week_end))[0] : undefined;
  const rating = reviews?.length ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length : null;
  const replies = reviews?.filter(review => !review.owner_reply).length ?? 0;

  // Exact preview figures stay behind the development-only demo flag.
  // Comparisons and payout dates are not invented for real accounts.
  const metrics: Metric[] = [
    { label: 'Today’s sales', value: DEMO_DATA_ENABLED ? '₹2,480' : formatInr(sales), badge: DEMO_DATA_ENABLED ? '+8% vs same time yesterday' : 'Sales before deductions', detail: DEMO_DATA_ENABLED ? '14 orders · avg ₹177' : `${billed.length} orders · avg ${billed.length ? formatInr(sales / billed.length) : '—'}`, href: '/analytics', icon: Banknote, tone: DEMO_DATA_ENABLED ? 'green' : 'neutral' },
    { label: 'Orders today', value: DEMO_DATA_ENABLED ? '14' : String(today?.ordersToday ?? placedToday.length), badge: DEMO_DATA_ENABLED ? '−5% vs same time yesterday' : 'Placed today', detail: DEMO_DATA_ENABLED ? '3 in progress · 1 cancelled' : `${today?.pendingToday ?? placedToday.filter(order => ['placed', 'packed', 'out_for_delivery'].includes(order.status)).length} in progress · ${placedToday.filter(order => order.status === 'cancelled').length} cancelled`, href: '/orders', icon: ShoppingBag, tone: DEMO_DATA_ENABLED ? 'red' : 'neutral' },
    { label: 'Products live', value: DEMO_DATA_ENABLED ? '42 / 48' : `${live} / ${products.length}`, badge: `${DEMO_DATA_ENABLED ? 6 : outOfStock} out of stock`, detail: `${DEMO_DATA_ENABLED ? 2 : pending} pending approval`, href: '/inventory', icon: Package, tone: 'red' },
    { label: 'Next payout', value: DEMO_DATA_ENABLED ? '₹3,078' : payout ? formatInr(payout.net_payout) : '—', badge: DEMO_DATA_ENABLED ? 'Processing' : payout ? payout.status.charAt(0).toUpperCase() + payout.status.slice(1) : payouts ? 'No payout scheduled' : 'Not available', detail: DEMO_DATA_ENABLED ? 'For 12–18 Oct · pays 21 Oct' : payout ? `For ${dateLabel(payout.week_start)}–${dateLabel(payout.week_end)}` : 'View your payout details', href: '/payouts', icon: Wallet, tone: payout?.status === 'failed' ? 'red' : payout?.status === 'paid' ? 'green' : 'amber' },
    { label: 'Rating', value: DEMO_DATA_ENABLED ? '4.3 ★' : rating !== null ? `${rating.toFixed(1)} ★` : '—', badge: DEMO_DATA_ENABLED ? '+0.2 vs last 30 days' : reviews ? `${reviews.length} reviews` : 'Not available', detail: DEMO_DATA_ENABLED ? '3 reviews need a reply' : `${replies} ${replies === 1 ? 'review needs' : 'reviews need'} a reply`, href: '/reviews', icon: Star, tone: DEMO_DATA_ENABLED ? 'green' : 'neutral' },
  ];

  return <section aria-label="Store overview" className="grid grid-cols-1 gap-1.5 min-[480px]:grid-cols-2 xl:grid-cols-5">
    {metrics.map(({ label, value, badge, detail, href, icon: Icon, tone }) => <Link key={label} href={href} className="min-w-0 rounded-[20px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
      <Card className="flex h-full min-h-[156px] min-w-0 flex-col border border-slate-200/60 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[14px] font-medium text-slate-600">{label}</h2>
          <Icon size={17} strokeWidth={1.7} className="shrink-0 text-slate-400" aria-hidden />
        </div>
        <p className="tnum mt-2 text-[30px] font-semibold leading-tight tracking-tight text-ink">{value}</p>
        <span className={`mt-2 inline-flex w-fit max-w-full items-center rounded-md px-2 py-1 text-[11px] font-medium leading-4 ${tones[tone]}`}>{tone === 'red' && label === 'Products live' && <span className="mr-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" aria-hidden />}{badge}</span>
        <div className="mt-auto flex items-start justify-between gap-1 pt-2">
          <p className="text-[12px] font-medium leading-5 text-slate-500">{detail}</p>
          <ArrowUpRight size={14} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />
        </div>
      </Card>
    </Link>)}
  </section>;
}
