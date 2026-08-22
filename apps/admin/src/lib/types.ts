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
