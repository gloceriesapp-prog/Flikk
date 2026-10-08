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
  // Real column (orders.commission_amount) — what Gloceries actually earned
  // from this specific order, not an estimated rate applied after the
  // fact. 0 for a cancelled/non-delivered order (nothing earned yet).
  commissionAmount: number;
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
  // Everything the partner Store Setup wizard collects (storeOnboarding.ts).
  // undefined = not submitted. PAN is the only document the wizard requires.
  storePhone?: string;
  addressLine?: string;
  manualAddress?: string;
  lat?: number;
  lng?: number;
  ownerName?: string;
  ownerEmail?: string;
  openTime?: string;
  closeTime?: string;
  fssaiNumber?: string;
  shopEstablishmentNumber?: string;
  panNumber?: string;
  udyamNumber?: string;
  // The reviewer's last rejection reason (draft.rejection_reason), shown
  // while the application is rejected or has been resubmitted.
  rejectionReason?: string;
  // Store: the applicant already owns a live store (re-application after
  // approval). Approving would create a duplicate, so it is refused.
  alreadyOwnsStore?: boolean;
  // Pharmacy category only — a stricter, separately regulated path (state
  // Drug Control authority, tied to a registered pharmacist), never
  // lumped in with general kirana document requirements.
  drugLicenseNumber?: string;
  // Rider-only fields — undefined for store applications (a rider's selfie
  // uses photoUrl above). aadhaarPhotoUrl/
  // dlPhotoUrl are short-lived SIGNED urls (rider-documents is a private
  // bucket, migrations/042_rider_onboarding.sql's own note) generated
  // fresh by GET /api/approvals/riders on every read, never stored as-is.
  // riderCode is the stable human ID ("GL078456"), assigned only once the
  // rider is approved (the real `riders` row) — undefined for pending drafts.
  riderCode?: string;
  dateOfBirth?: string;
  homeAddress?: string;
  aadhaarNumber?: string;
  aadhaarPhotoUrl?: string;
  dlNumber?: string;
  dlPhotoUrl?: string;
  vehicleType?: 'bicycle' | 'scooter' | 'motorcycle';
  vehicleNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
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
  // Account-active bit (riders.is_active). NOT live presence — see `presence`
  // below. AssignRiderRow filters the assignable list on this, unchanged.
  isOnline: boolean;
  // The REAL live presence signal (riders.status), distinct from isOnline.
  presence: 'offline' | 'online' | 'on_delivery';
  // riders.auto_online — rider opted into going online automatically during
  // their configured availability window.
  autoOnline: boolean;
  // Whether IST-now falls inside this rider's configured availability window
  // (computed server-side via isWithinSchedule). False when never configured.
  onScheduleNow: boolean;
  // Weekly availability (riders.availability), day 0=Sun..6=Sat, 'HH:MM' IST,
  // meaningful only when enabled. [] = never configured.
  availability: { day: number; enabled: boolean; start: string; end: string }[];
  // Admin suspension (riders.is_active=false via admin_set_rider_suspension).
  // Null while active. Optional so other ActiveRider producers stay valid.
  suspendedReason?: string | null;
  suspendedAt?: string | null;
}

// One weekly payout row on the admin Payouts page — store (payouts) or rider
// (rider_payouts), one combined list. Founder pays manually and records the
// UTR (backend/PAYOUTS.md). Full account number is admin-only, never sent to
// partner/rider clients. Amounts are rupees as returned by Postgres numeric.
export type PayoutKind = 'store' | 'rider';
export type PayoutRowStatus = 'pending' | 'paid' | 'blocked' | 'failed';

export interface AdminPayoutRow {
  kind: PayoutKind;
  id: string;
  // stores.id for a store, users.id (= riders.user_id = rider_payouts.rider_id) for a rider.
  payeeId: string;
  payeeName: string;
  phone: string | null;
  method: 'upi' | 'bank' | null;
  upiId: string | null;
  accountNumber: string | null;
  ifsc: string | null;
  bankName: string | null;
  accountHolderName: string | null;
  hasProof: boolean;
  verification: 'unverified' | 'verified';
  verifiedName: string | null;
  netAmount: number;
  weekStart: string;
  weekEnd: string;
  status: PayoutRowStatus;
  utr: string | null;
  paymentMode: 'upi' | 'bank_transfer' | null;
  paidAt: string | null;
  paidBy: string | null;
  note: string | null;
}

// Store management — the live roster, separate from Application (which is
// only the pre-approval submission). A store graduates from Application to
// Store the moment it's approved.
export interface Store {
  manualAddress?: string;
  udyamNumber?: string;
  avgPrepMinutes?: number;
  id: string;
  name: string;
  category: string;
  zone: string;
  district: string;
  phone: string;
  openTime: string;
  closeTime: string;
  // Partner's temporary open/closed switch (stores.is_active).
  isActive: boolean;
  // Admin suspension (migration 110) — distinct from isActive; only admin
  // lifts it, and the store cannot reopen while it is set.
  adminSuspended?: boolean;
  suspendedReason?: string | null;
  suspendedAt?: string | null;
  ownerName: string;
  joinedAt: string;
  // Real onboarding fields (AddStoreModal / storeValidation.ts) — same
  // document set Application already tracks pre-approval, now on the live
  // store record itself since a store is created here directly rather than
  // graduating through /approvals.
  addressLine: string;
  city: string;
  state: string;
  country: string;
  photoUrl?: string;
  fssaiNumber: string;
  shopEstablishmentNumber: string;
  panNumber: string;
  aadhaarLast4: string;
  bankName: string;
  bankAccountLast4: string;
  turnoverExceedsGstThreshold: boolean;
  gstNumber?: string;
  // Pharmacy category only.
  drugLicenseNumber?: string;
  // The store's own fixed map pin — customer app's "Shops Near You" sorts
  // by this (apps/customer/src/screens/home/nearby-stores/useNearbyStores.ts).
  // Undefined for any store approved before migrations/005_stores_lat_lng.sql
  // added these columns; StoreDetailForm is how a founder backfills one by
  // hand instead of hand-writing a SQL UPDATE.
  lat?: number;
  lng?: number;
  // Max delivery distance (km) from this store's pin — the cutoff GET
  // /stores/nearest and /serviceability compare haversine distance against.
  // Undefined = use backend's global DEFAULT_RADIUS_KM (12). Founder overrides
  // per store here (migration 048).
  deliveryRadiusKm?: number;
}

export type NewStoreInput = Omit<Store, 'id' | 'zone' | 'isActive' | 'joinedAt' | 'adminSuspended' | 'suspendedReason' | 'suspendedAt'>;

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

// "We want Gloceries here" — a demand signal collected from the customer app
// (a place a customer searches/enters that Gloceries doesn't cover yet, per
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
  // The handling/platform fee charged to customers — real money Gloceries
  // keeps (never paid to a store or a rider), distinct from commission
  // (which comes from stores). app/api/revenue-trend's own note has the
  // full reasoning.
  platformFee: number;
}

// Customer-app installs, split by store — no App Store Connect / Play
// Console API integration exists yet (same category as the payment provider/WhatsApp
// in CLAUDE.md's env-scoped external services, just not wired up), so
// this is "last synced" data, not a true real-time counter. Split by
// platform rather than combined: a founder watching for install friction
// on one store specifically (e.g. Android install drop-off, iOS review
// delay) needs the two numbers separate, not folded into one total.
export interface AppDownloadStats {
  android: number;
  ios: number;
  changePctThisWeek: number;
  lastSyncedAt: string;
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
  // A real uploaded photo (Add/EditProductModal -> ProductImageUpload ->
  // Supabase Storage, stored on products.image_url) rather than the emoji
  // stand-in this used to be. Optional: the inventory list shows an icon
  // placeholder (see (dashboard)/inventory/page.tsx) whenever a product has
  // none — never a random stock photo.
  imageUrl?: string;
  // Pastel card background extracted from imageUrl at upload time
  // (lib/bgColor.ts, app/api/upload), or a category tint / neutral mist
  // when extraction wasn't possible — see lib/productValidation.ts
  // toProductRow's own note on the full fallback chain. Always set on any
  // product written through this dashboard (products.bg_color is NOT NULL
  // with a mist default), so this is only optional for products fetched
  // before the column existed.
  bgColor?: string;
  // MRP — only shown (struck through, next to price) when it's actually
  // higher than price, same convention as the customer app's own
  // originalPrice on Product (apps/customer/src/screens/home/products/types.ts).
  originalPrice?: number;
  // Same fields the customer app's own ProductCard reads (apps/customer/
  // src/screens/home/products/types.ts) — a store owner sets these when
  // listing a product, they're not admin-computed. localName/isVeg apply
  // to any product; freshnessTag is picked from FRESHNESS_TAG_PRESETS
  // (mock-data.ts) rather than free text, so the customer app doesn't end
  // up with a dozen near-duplicate ribbon strings across stores.
  localName?: string;
  isVeg?: boolean;
  freshnessTag?: string;
  // Shown on the customer app's ProductDetailSheet (that Product's own
  // description field) — a short paragraph, not required for a card to be
  // listable at all, same optional-with-graceful-fallback pattern as the
  // rest of this block.
  description?: string;
  // Per-size pricing (Blinkit/Instamart model) — variants[0] is always the
  // default/primary listing, and its price/unit are exactly what price/unit
  // above already hold (denormalized server-side, see lib/productValidation.ts
  // toProductRow). A product with only one size still has exactly one
  // variant here, never zero.
  variants: ProductVariant[];
  // Real sub_categories.id this product shows under on the customer app's
  // CategoryDetailScreen (GET /categories/subcategories/:id/products) —
  // independent of `category` above (the free-text PRODUCT_CATEGORIES
  // field), see lib/productValidation.ts's own note on why the two aren't
  // unified yet. Optional — a product with none just doesn't appear in any
  // category browse grid, only in the general catalog feeds.
  subCategoryId?: string;
  // 'pending' when a store owner added/edited it from the partner app
  // (backend's POST/PATCH /partner/products) — invisible on every
  // customer-facing feed until this flips to 'approved' (see this
  // dashboard's own Inventory page, approve/reject buttons). Products this
  // dashboard adds itself insert as 'approved' directly — a founder adding
  // one already is the approval. Optional on NewProductInput (Omit<Product,
  // 'id' | 'storeName'>) — always server-assigned on write, never sent by
  // Add/EditProductModal; always present on anything read back via
  // mapRowToProduct.
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  // A partner-submitted photo awaiting founder review (products.pending_image_url).
  // The product keeps showing its live imageUrl until admin approves this on
  // the Approvals screen's Products tab (app/api/products/[id]/image-review).
  // null = nothing pending; undefined only for rows read before the column existed.
  pendingImageUrl?: string | null;
  // Total counted packs across sizes (products.stock_quantity); null when
  // stock tracking is off (checkout refuses such products).
  stockQuantity?: number | null;
}

export interface ProductVariant {
  id?: string;
  unitType: 'g' | 'kg' | 'ml' | 'l' | 'pc';
  quantity: number;
  price: number;
  originalPrice?: number;
  // Counted retail packs of this size on hand (product_variants.
  // stock_quantity). Checkout only sells counted packs, so Add/Edit require
  // it; undefined = never counted.
  stockQuantity?: number;
}

// What AddProductModal actually collects and POSTs to /api/products —
// everything Product has except `id` (DB-generated on insert) and
// `storeName` (the API derives it server-side via the stores join, same
// mapRowToProduct used for reads — the modal only knows storeId, picked
// from a real StoreOption).
export type NewProductInput = Omit<Product, 'id' | 'storeName'>;

// Categories screen — the real name+photo pair the customer app's own
// Categories browse grid reads (backend/src/routes/categories.ts ->
// apps/customer/src/components/CategorySections/), not a hardcoded UI
// string. sortOrder controls the grid's left-to-right/top-to-bottom order;
// a founder reordering categories is a real, expected operation (a bigger
// zone's top categories should show first), not a one-time setup step.
export interface Category {
  id: string;
  name: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  // Which title/group this category shows under on the customer app's
  // Categories screen (e.g. "Groceries & Staples") — see CategorySection
  // below. Optional at the type level since a category can technically
  // exist without one (RLS: on_delete set null if its section is removed),
  // but AddCategoryModal/EditCategoryModal require picking one — a
  // category with no title has nowhere to render on the grouped grid.
  sectionId?: string;
}

// A title heading on the customer app's Categories screen — "Groceries &
// Staples", "Snacks & Drinks", etc. — grouping several Category tiles
// underneath it. Managed from the Categories page's own "Titles" strip,
// separate from any single category's edit modal since a title is a peer
// of categories, not a child of one.
export interface CategorySection {
  id: string;
  name: string;
  sortOrder: number;
}

export type NewCategoryInput = Omit<Category, 'id'>;

// Home screen's own top category-tab row (All/Groceries/Fresh/Bakery/...,
// apps/customer/src/screens/home/components/CategoryTabs.tsx) and each
// tab's tile grid — deliberately separate from Category/CategorySection
// above (the main Categories browse screen's own data). Editing one must
// never touch the other, per an explicit ask — this dashboard's own
// "Home Categories" page (app/(dashboard)/home-categories) is a
// completely separate screen from "Categories" for exactly that reason.
export interface HomeTab {
  id: string;
  name: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface HomeTabTile {
  id: string;
  homeTabId: string;
  name: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  // migration 097 — where tapping the tile navigates (null = nowhere).
  linkType: HomeTabTileLinkType | null;
  linkId: string | null;
}

export type HomeTabTileLinkType = 'category' | 'subcategory' | 'store';

// "Ads and poster for different category" — a tab's own promo banner(s),
// same isolation reasoning as HomeTab/HomeTabTile above. Image only, no
// badge/heading/subheading text — per an explicit ask to drop the text
// entirely and keep this a pure image poster. Rendered by apps/customer's
// PosterBanner.tsx across every tab (generic + the 4 hand-built rich
// screens alike).
export interface HomeTabBanner {
  id: string;
  homeTabId: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
}

export type NewHomeTabInput = Omit<HomeTab, 'id'>;
export type NewHomeTabTileInput = Omit<HomeTabTile, 'id'>;
export type NewHomeTabBannerInput = Omit<HomeTabBanner, 'id'>;

// Payments run on Cashfree; 'razorpay' marks legacy rows (migration 103) that
// can't be refunded through Cashfree and land in 'manual_required'.
export type PaymentProvider = 'cashfree' | 'razorpay';
export type RefundStatus = 'none' | 'processing' | 'completed' | 'failed' | 'manual_required';

// Cashfree documents no per-order deep link — this opens the merchant
// dashboard; search Payments by the order id shown next to it.
export const CASHFREE_DASHBOARD_URL = 'https://merchant.cashfree.com/';
