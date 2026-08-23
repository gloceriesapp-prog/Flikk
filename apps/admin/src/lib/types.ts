// Mirrors specs/00-foundation/data-model.md — only the fields this
// dashboard's screens actually read, not the full backend row shape.

export type OrderStatus = 'placed' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  storeName: string;
  storeId: string;
  zone: string;
  placedAt: string;
  amount: number;
  status: OrderStatus;
  riderId: string | null;
  // Minutes since placed with no forward progress — how the Home
  // snapshot's "needs attention" widget and Orders' own flag are computed,
  // not a separate field the backend sends.
  minutesSinceStatusChange: number;
}

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

// A1 — a store or rider application awaiting founder approval. `kind`
// distinguishes the two since A1 is one tabbed screen, not two separate
// ones (specs/04-admin-dashboard/screens.md's own note on why). Mirrors
// apps/partner's StoreDraft shape for the store case (photoUrl/gstNumber
// included) — this is genuinely the same submission, viewed from the
// other side.
export interface Application {
  id: string;
  kind: 'store' | 'rider';
  name: string;
  category: string | null; // store only
  zone: string;
  submittedAt: string;
  status: ApplicationStatus;
  phone: string;
  // Store-only fields — undefined for rider applications.
  photoUrl?: string;
  gstNumber?: string;
  district?: string;
  // Store verification documents — each undefined/false means "not yet
  // submitted", not "not required" (GSTIN is the one exception: it's
  // legitimately optional under the ₹40L GST threshold, tracked
  // separately via turnoverExceedsGstThreshold rather than by presence).
  fssaiNumber?: string;
  shopEstablishmentNumber?: string;
  panNumber?: string;
  aadhaarLast4?: string;
  bankAccountLast4?: string;
  turnoverExceedsGstThreshold?: boolean;
  // Pharmacy category only — a stricter, separately regulated path (state
  // Drug Control authority, tied to a registered pharmacist), never
  // lumped in with general kirana document requirements.
  drugLicenseNumber?: string;
}

// A3 — an active rider available for manual assignment. No suggested-rider
// algorithm, no auto-assign (specs/00-foundation/out-of-scope.md) — this
// list is just who's on shift right now.
export interface ActiveRider {
  id: string;
  name: string;
  phone: string;
  activeOrders: number;
  zone: string;
  isOnline: boolean;
}

// A4 — one store's payout for a settlement cycle. commissionRate matches
// PRD Section 22 (12-18% from store partner per order).
export interface Payout {
  id: string;
  storeName: string;
  cycleLabel: string;
  grossSales: number;
  commissionRate: number;
  netPayout: number;
  status: 'pending' | 'paid';
  paidAt: string | null;
  // Where the net payout actually lands — same masked-account convention
  // as WalletBalance's own bankName/bankAccountLast4 (the founder's own
  // withdraw destination). A founder releasing a payout needs to see
  // where the money is going, same as they'd expect from any real payroll
  // run.
  bankName: string;
  bankAccountLast4: string;
}

// Store management — the live roster, separate from Application (which is
// only the pre-approval submission). A store graduates from Application to
// Store the moment it's approved.
export interface Store {
  id: string;
  name: string;
  category: string;
  zone: string;
  district: string;
  phone: string;
  openTime: string;
  closeTime: string;
  isActive: boolean;
  ownerName: string;
  joinedAt: string;
}

// zones is first-class in the DB from day 1 (PRD Section 16) even though
// only one is active at launch — this type exists so the Zones screen can
// show the framework (a second zone slots in with zero schema change),
// not because multi-zone is in scope now (CLAUDE.md: single-zone only).
export interface Zone {
  id: string;
  name: string;
  isActive: boolean;
  storeCount: number;
  riderCount: number;
}

// "We want Flikk here" — a demand signal collected from the customer app
// (a place a customer searches/enters that Flikk doesn't cover yet, per
// this screen's own note on where the data comes from), not a zone
// itself. Purely informational for the founder deciding where a real
// second zone (still out of scope per CLAUDE.md) should eventually go —
// upvoting a place never activates it.
export interface ZoneRequest {
  id: string;
  placeName: string;
  district: string;
  upvotes: number;
  firstRequestedAt: string;
}

export interface RevenuePoint {
  label: string;
  commission: number;
}

// The founder's own take-home balance — platform commission earned, not
// the gross sale amount (that mostly belongs to the stores). Available
// to withdraw = earned commission not yet paid out to the founder's own
// bank account, distinct from Payouts (which is money owed *to stores*).
export interface WalletBalance {
  availableToWithdraw: number;
  lastWithdrawnAmount: number;
  lastWithdrawnAt: string;
  // Commission already earned on orders still settling (not yet cleared
  // into availableToWithdraw) — the other number a real payout wallet
  // always shows next to "available," so it's clear more is coming, not
  // just what's sitting there now.
  pendingSettlement: number;
  pendingSettlementNote: string;
  // Where "Withdraw" actually sends the money — masked, same convention
  // as apps/partner's own phone-number display (shown, never editable
  // inline here).
  bankName: string;
  bankAccountLast4: string;
  // The other half of the picture: what customers actually paid across
  // this period (grossCollected) splits into the founder's own commission
  // (availableToWithdraw + pendingSettlement) and what's still owed back
  // out to stores (owedToStores) — PRD Section 22's 12-18% cut, not 100%
  // of gross. Without this, "Balance" only shows one slice of a bigger
  // number and reads as if the whole gross amount were the founder's.
  grossCollected: number;
  owedToStores: number;
}

// Platform health — stands in for a real uptime/incident feed once one
// exists (status page, error-rate alerting, etc.). Overview's header shows
// this instead of a static "Export/Add" button pair — "is the product
// actually live right now" is a more useful glance-and-go signal for a
// founder than two action buttons that already live inline elsewhere.
export type SystemHealth = 'operational' | 'degraded' | 'down';

export interface SystemStatus {
  health: SystemHealth;
  message: string;
  lastUpdatedAt: string;
}

// Customer-app installs, split by store — no App Store Connect / Play
// Console API integration exists yet (same category as Razorpay/WhatsApp
// in CLAUDE.md's env-scoped external services, just not wired up), so
// this is "last synced" data, not a true real-time counter. Split by
// platform rather than combined: a founder watching for install friction
// on one store specifically (e.g. Android install drop-off, iOS review
// delay) needs the two numbers separate, not folded into one total.
// Per-platform build health — no crash-reporting integration (Sentry/
// Crashlytics) is wired up yet, same "not real-time" caveat as the
// download counts themselves. `issue` carries an actual, specific message
// rather than a generic "problem" — a founder acting on this needs to
// know what broke, not just that something did.
export type AppPlatformHealth = 'operational' | 'issue';

export interface AppPlatformStatus {
  health: AppPlatformHealth;
  message: string;
}

export interface AppDownloadStats {
  android: number;
  ios: number;
  changePctThisWeek: number;
  lastSyncedAt: string;
  androidStatus: AppPlatformStatus;
  iosStatus: AppPlatformStatus;
}

// "How people use the product" — Overview's usage/performance widget.
// completionRate (the gauge's own value) is a real derived number —
// delivered orders ÷ every order that reached a terminal-or-active state,
// excluding ones still freshly placed with no outcome yet. avgDeliveryMins
// and repeatCustomerRate are the two supporting numbers a founder would
// actually ask "so is the product working well?" — completion rate alone
// doesn't say whether people come back or how fast delivery actually is.
export interface ProductPerformance {
  completionRate: number; // 0-100, drives the gauge
  avgDeliveryMinutes: number;
  repeatCustomerRate: number; // 0-100
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

// Inventory — a cross-store catalog view for the founder ("what do stores
// actually stock, and are any of them running low"), editable from admin
// only (name/image/price/stock) — not a POS sync (CLAUDE.md: real-time
// inventory sync with store POS is explicitly out of scope until MVP
// validates). stockStatus is store-reported, not live-polled.
export interface Product {
  id: string;
  name: string;
  category: string;
  storeName: string;
  storeId: string;
  price: number;
  unit: string;
  stockStatus: StockStatus;
  // Emoji stand-in for a real product photo — no asset upload pipeline
  // exists yet, this is the "image" a founder can eyeball and edit today.
  imageEmoji: string;
}
