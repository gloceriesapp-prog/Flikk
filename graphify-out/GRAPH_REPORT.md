# Graph Report - Flikk  (2026-10-07)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 5797 nodes · 16407 edges · 349 communities (170 shown, 179 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 185 edges (avg confidence: 0.85)
- Token cost: 20,565 input · 4,218 output

## Graph Freshness
- Built from commit: `502c45ea`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Auth Session and Stream Management
- Project Dependencies and Config
- Product Approval and Festival Sections
- Order Refund Processing
- Request Admission Control
- Concurrency Testing Scripts
- Dev Server and Migrations
- Supabase Auth Integration
- Store Location and Status Filters
- Payment Recovery Flow
- Home Content Management
- Delivery Settings Page
- Product Pagination and Variants
- Backend Dependencies
- Database Schema Indexes
- Testing and Metrics Infrastructure
- Development Tooling
- NPM Scripts
- Environment and Geocoding Config
- Checkout Quotes and Pricing
- Order Expiry Management
- Cart State Management
- Collection Browsing Rules
- Checkout Recovery Storage
- Inventory and Checkout Logic
- Connection Lifecycle Management
- Payment and Refund Processing
- Auth and Privacy Backend
- Checkout Inventory Cleanup
- Delivery Address Masking
- Payouts and Notifications
- Purchase History and Testing
- Live Order Tracking
- Checkout Catalog and Availability
- Rider Performance Stats
- Customer Deletion Management
- Order and Payout History
- TypeScript Configuration
- ESLint Configuration
- Secure Account Storage
- Realtime Stream Management
- K6 Load Testing
- Customer Support and Refunds
- Rider Schedule Validation
- Weekly Payout Processing
- Payment Preference Management
- Product Popularity and Inventory
- Checkout Feature Roadmap
- Admin Store API
- Rider Cancellation Reasons
- Delivery Failure Reasons
- Core Database Schema
- Background Worker Jobs
- Atomic Financial Transactions
- Delivery Settings Tests
- Store Discovery and Deals
- Purchase History Cache
- Notification Navigation Tests
- Legacy Schema and Metadata
- Payment Reconciliation and Reservations
- Delivery Code Security
- Home Content Management
- Promotion and Receipt Snapshots
- Security and Checkout Policy
- Version and Migration Manifest
- Discovery and Background Workers
- Tracking Policy
- Database Audit Findings
- Browse Visibility Policy
- Reservation and Capacity
- Catalogue Browsing Limits
- Refund Visibility Management
- Checkout Audit Follow-up
- Customer Notifications
- Checkout History Management
- Inventory Synchronization
- Media Storage
- Promotional Delivery
- System Lifecycle Management
- Product Search and Discovery
- Checkout Eligibility Logic
- Order Variant Snapshots
- Payment Recovery Sessions
- Customer Push Notifications
- Trip Cancellation Refunds
- Inventory Signal Sync
- Unpaid Reservation Expiry
- Commerce Security Policies
- Rider Payout Schema
- Auth Abuse Prevention
- Store Review Totals
- Media Asset Cleanup
- Promotional Delivery Queue
- Variant Checkout Schema
- Capacity Observability Metrics
- Repeat Purchase Analytics
- Trip Order Schema
- Promo Code Schema
- Delivery Estimate Snapshots
- Store Discovery Search
- Address Snapshot Schema
- Unpaid Checkout Abandonment
- Supabase Bootstrap Schema
- Review System Schema
- Trip Order Functions
- Payment Method Schema
- Notification System Schema
- Product MRP Snapshots
- Auth Context Functions
- Live Tracking Revisions
- Session Expiry Logic
- Collection Browse Indexing
- Order Refund Jobs
- Rider Capacity Schema
- Payout History Pagination
- Trip Order Creation
- User Referral System
- Customer Support and Experience
- Rider Payout Workers
- Festival Section Products
- User Wishlist Management
- Address Soft Deletion
- Seasonal UI Components
- Rider Onboarding Process
- Rider Payout Computation
- Atomic Trip Delivery
- Auth Session Tracking
- Backend Earnings Audit
- Checkout Attempt Tracking
- Delivery Settings Configuration
- Area Upvoting System
- Platform Settings Management
- Festival Greeting Content
- Home Screen Sections
- App Content Management
- Inventory Synchronization
- Payment and Order Creation
- User Account and Profile
- App Navigation and Screens
- Category and Product Browsing
- Geocoding and Location Services
- Delivery Settings and Inventory Cache
- API Client and Auth
- Product Detail UI
- Home Banners and Images
- Product Wishlist
- Inventory and Store Discovery
- Order and Trip Tracking
- Festival Offers and Collections
- Order Bill Calculation
- Order Cancellation and Refunds
- Address and Cart Management
- Customer Auth and Notifications
- Home Category UI
- App Configuration and Copy
- Cart and Bill Details
- API Base URL
- App Navigation Shell
- API Client and Product Mapping
- Order Reviews API
- Customer Support and Refunds
- UI Gradients and Styling
- Order History API
- Order Tracking Timeline
- Error Handling and Reporting
- Store Discovery UI
- Kitchen and Local Brands
- Category UI Components
- Receipt Generation UI
- Festival Greeting UI
- VPA Payment Management
- Fresh Produce Collections
- Order Status Mapping
- Bottom Navigation UI
- Delivery Arrival Estimates
- Checkout Quote API
- Barcode Encoding
- Font Asset Validation
- Account Session Isolation
- Customer Notifications
- Source Code Structure
- Home Browsing Readiness
- Delivery Estimates
- UI Components and Navigation
- Store Location and Drafts
- Order Tracking and Earnings
- Product Management API
- Payout Management
- Payout Proof and Image Compression
- Store Onboarding and Auth
- User Onboarding and Login
- Partner Onboarding Flow
- Order Alert Audio
- Typography Assets
- Customer Application
- Source Code Structure
- Rider Dispatch and Routing
- Rider Profile and Performance
- Order Mocking and UI Components
- Rider Earnings Dashboard
- Dispatch and Map Integration
- Delivery History and Navigation
- Device Auth and Push Tokens
- Rider Bank Details and Payouts
- Availability and Authentication
- Rider Notifications and Navigation
- Rider Onboarding Process
- UI Error Boundary
- Typography Assets
- Inventory and Stock Management
- Home Tab Configuration API
- Admin API Routes
- Store Management API
- Category Management API
- Rider and Store Approvals
- Home Content Editor
- Admin Overview and Analytics
- Admin Auth and Payout Routes
- Customer and Promo Code Admin
- Admin Order and Customer Management
- Admin App Content Management
- Media Upload and Processing
- Admin Content Management
- Admin Operations and Deletions
- Category and Auth Routes
- Application Approval Workflow
- Rider Status API
- Promo Code Management
- Refund Management Page
- Dashboard Layout Navigation
- Customer Support Inbox
- Rider and Zone Management
- Support Ticket API
- App Root Layout
- Home Content API
- Home Section Editor
- Customer Deletion Requests
- Inventory Stock Editor
- Festival Greeting API
- Festival Greeting Management
- Store Admin Management

## God Nodes (most connected - your core abstractions)
1. `AppIcon()` - 170 edges
2. `AppError` - 164 edges
3. `apiRequest()` - 109 edges
4. `vitest` - 103 edges
5. `AppIcon()` - 100 edges
6. `AppIcon()` - 87 edges
7. `express` - 84 edges
8. `supabase` - 78 edges
9. `Product` - 78 edges
10. `AppStackParamList` - 73 edges

## Surprising Connections (you probably didn't know these)
- `Props` --references--> `Product`  [EXTRACTED]
  components/ProductDetailSheet/ProductDetailFooter.tsx → screens/home/products/types.ts
- `CardProps` --references--> `Product`  [EXTRACTED]
  components/ProductDetailSheet/ProductDetailSheet.tsx → screens/home/products/types.ts
- `Props` --references--> `Product`  [EXTRACTED]
  components/ProductDetailSheet/ProductDetailSheet.tsx → screens/home/products/types.ts
- `Page` --references--> `ApiProduct`  [EXTRACTED]
  screens/home/content/useCollectionInventory.ts → api/products.ts
- `PaymentMethodScreen()` --indirect_call--> `fetchPaymentPreference()`  [INFERRED]
  screens/payment-method/PaymentMethodScreen.tsx → api/payments.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Financial Operations and Payout Lifecycle** — backend::backend_payouts_manual_policy, backend::backend_order_safety_policy, backend::backend_payments_cashfree_policy, backend::backend_discovery_and_workers_policy [EXTRACTED 0.90]
- **Checkout Flow Integrity and Security** — backend::backend_checkout_eligibility_policy, backend::backend_checkout_quotes_policy, backend::backend_checkout_recovery_policy, backend::backend_commerce_security_policy, backend::backend_variant_checkout_policy [EXTRACTED 0.95]
- **System Observability and Capacity Management** — backend::backend_capacity_and_expiry_policy, backend::backend_discovery_and_workers_policy, backend::backend_startup_shutdown_policy [INFERRED 0.85]

## Communities (349 total, 179 thin omitted)

### Community 0 - "Auth Session and Stream Management"
Cohesion: 0.07
Nodes (35): invalidateAllAuthContexts(), invalidateAuthUser(), StreamAdmission, streamLimit(), StreamWriter, writeStreamFrame(), HomeBroker, HomeEvent (+27 more)

### Community 1 - "Project Dependencies and Config"
Cohesion: 0.06
Nodes (30): name, private, type, version, @aws-sdk/client-s3, compression, eslint, node-cron (+22 more)

### Community 2 - "Product Approval and Festival Sections"
Cohesion: 0.11
Nodes (29): GET(), PATCH(), POST(), FestivalProductLink, FestivalSection, FestivalSectionPage(), CATEGORY_TINT_MAP, MIST_FALLBACK (+21 more)

### Community 3 - "Order Refund Processing"
Cohesion: 0.12
Nodes (25): logger, cashfreeRefundId(), CfRefund, OrderRefundJob, processOrderRefund(), runOrderRefunds(), save(), job (+17 more)

### Community 4 - "Request Admission Control"
Cohesion: 0.09
Nodes (22): toErrorBody(), errorHandler(), accountBudget, Bucket, concurrentAdmission(), costlyBudget, publicBudget, requestAdmission() (+14 more)

### Community 5 - "Concurrency Testing Scripts"
Cohesion: 0.13
Nodes (10): query(), success(), query(), drain(), query(), require(), sql(), sql() (+2 more)

### Community 6 - "Dev Server and Migrations"
Cohesion: 0.09
Nodes (13): acquire(), nonce, port, portAvailable(), probeHost(), root, baselineIndex, directory (+5 more)

### Community 7 - "Supabase Auth Integration"
Cohesion: 0.10
Nodes (29): @supabase/supabase-js, authenticate(), AuthRow, cacheTtl(), checkedContext(), Context, contexts, denied() (+21 more)

### Community 8 - "Store Location and Status Filters"
Cohesion: 0.08
Nodes (29): fetchTodayStats(), TodayStats, useChangeStoreLocation(), FilterOption, OrderStatusFilter(), OrderStatusFilterValue, Props, getMissingProfileFields() (+21 more)

### Community 9 - "Payment Recovery Flow"
Cohesion: 0.14
Nodes (17): abandonCheckout(), CashfreeOrder, createPaymentOrder(), recoverPayment(), rememberPaymentMethod(), verifyPayment(), PaymentRecoveryScreen(), abandon() (+9 more)

### Community 10 - "Home Content Management"
Cohesion: 0.11
Nodes (4): ids, products, context, mocks

### Community 11 - "Delivery Settings Page"
Cohesion: 0.23
Nodes (10): GET(), PATCH(), NOTIFICATION_PREFS, SettingsPage(), ToggleSwitch(), DELIVERY_SETTINGS_SELECT, DeliverySettings, DeliverySettingsRow (+2 more)

### Community 12 - "Product Pagination and Variants"
Cohesion: 0.04
Nodes (66): sharp, replaceProductVariants(), Cursor, cursorFilter(), encodeCursor(), PageOptions, readPage(), sendPage() (+58 more)

### Community 13 - "Backend Dependencies"
Cohesion: 0.18
Nodes (11): dependencies, @aws-sdk/client-s3, compression, express, node-cron, pino, pino-http, pino-pretty (+3 more)

### Community 14 - "Database Schema Indexes"
Cohesion: 0.07
Nodes (27): addresses_user_id_idx, addresses_zone_id_idx, festival_section_products_product_id_idx, home_tab_banners_home_tab_id_idx, order_items_order_id_idx, order_items_product_id_idx, orders_address_id_idx, orders_customer_id_idx (+19 more)

### Community 15 - "Testing and Metrics Infrastructure"
Cohesion: 0.13
Nodes (13): app, server, measureDatabaseFetch(), operation(), measureHttp(), BOUNDS, escape(), Labels (+5 more)

### Community 16 - "Development Tooling"
Cohesion: 0.18
Nodes (11): devDependencies, eslint, tsx, @types/compression, @types/express, @types/node, @types/node-cron, typescript (+3 more)

### Community 17 - "NPM Scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, dev:worker, lint, start, start:worker, test

### Community 18 - "Environment and Geocoding Config"
Cohesion: 0.09
Nodes (23): env, port, authBucket(), mapsBudget(), GoogleGeocodeResponse, GoogleGeocodeResult, NULL_RESULT, pickComponent() (+15 more)

### Community 19 - "Checkout Quotes and Pricing"
Cohesion: 0.07
Nodes (40): PricedCheckoutItem, calculateCheckoutBill(), EXTRA_STOP_FEE, issueQuote(), QUOTE_TTL_MS, QuoteSnapshot, quoteVersion(), requireConfirmedQuote() (+32 more)

### Community 20 - "Order Expiry Management"
Cohesion: 0.04
Nodes (91): paymentsConfigured, drainExpiredReservations(), ExpiryBatch, RECONCILE_BATCH, reconcileBeforeExpiry(), ReconcileRow, runReservationExpiry(), rpc (+83 more)

### Community 22 - "Collection Browsing Rules"
Cohesion: 0.09
Nodes (24): BrowseRule, collectionRouter, contentFor(), pageSize(), PRICE_BANDS, STORE_SORTS, storePageFilters(), mocks (+16 more)

### Community 24 - "Inventory and Checkout Logic"
Cohesion: 0.09
Nodes (15): create_order(), create_trip_orders(), inventory_reservations_expiry_idx, inventory_reservations_order_idx, order_items_reserve_stock, orders_checkout_eligibility, orders_finish_inventory, products_tracked_inventory (+7 more)

### Community 26 - "Payment and Refund Processing"
Cohesion: 0.11
Nodes (9): public.approve_failed_trip_refund(), public.claim_checkout_expiry_reconciliation(), public.claim_checkout_payment(), public.enqueue_trip_refund(), public.fail_assigned_trip(), public.queue_cancelled_order_refund(), public.release_abandoned_promotion(), public.reserve_checkout_stock() (+1 more)

### Community 27 - "Auth and Privacy Backend"
Cohesion: 0.04
Nodes (106): express, Action, authBudget(), limits, privacyRouter, ReceiptItem, receiptItems(), withReceiptAddress() (+98 more)

### Community 29 - "Delivery Address Masking"
Cohesion: 0.43
Nodes (5): OrderDeliveryAddress, ApiTrip, DeliveryDetailsSection(), Props, maskRecipientPhone()

### Community 30 - "Payouts and Notifications"
Cohesion: 0.08
Nodes (7): payouts_utr_unique, public.capacity_snapshot(), public.mark_payout_paid(), public.reset_payout_verification(), rider_payouts_utr_unique, riders_reset_payout_verification, stores_reset_payout_verification

### Community 32 - "Purchase History and Testing"
Cohesion: 0.04
Nodes (36): vitest, DeliveredOrderItem, rankRepeatPurchases(), reorderByRank(), functions, sql, request, fixture (+28 more)

### Community 35 - "Checkout Catalog and Availability"
Cohesion: 0.05
Nodes (46): row, loadCheckoutItems(), readCheckoutCatalog(), requirePackSnapshots(), mocks, AvailabilityIssue, checkoutAvailability(), DEFAULT_CHECKOUT_RADIUS_KM (+38 more)

### Community 36 - "Rider Performance Stats"
Cohesion: 0.40
Nodes (3): computeRiderStats(), RiderStats, s

### Community 37 - "Customer Deletion Management"
Cohesion: 0.10
Nodes (20): customer_deletion_requests_queue, customer_one_deletion_request, customer_push_receipts_due, orders_customer_deletion_guard, public.claim_push_receipts(), public.customer_deletion_requests, public.customer_push_receipts, public.request_customer_deletion() (+12 more)

### Community 38 - "Order and Payout History"
Cohesion: 0.12
Nodes (17): orders_customer_solo_history_idx, orders_payout_breakdown_idx, orders_rider_history_idx, orders_status_history_idx, orders_store_history_idx, orders_store_status_history_idx, payouts_store_history_idx, payouts_week_history_idx (+9 more)

### Community 39 - "TypeScript Configuration"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, noUncheckedIndexedAccess, outDir, rootDir (+5 more)

### Community 40 - "ESLint Configuration"
Cohesion: 0.15
Nodes (12): env, es2022, node, extends, parser, plugins, root, rules (+4 more)

### Community 44 - "Realtime Stream Management"
Cohesion: 0.17
Nodes (3): cleanup, state, streams

### Community 45 - "K6 Load Testing"
Cohesion: 0.18
Nodes (8): accounts, base, options, params(), rate, semanticErrors, setup(), vus

### Community 46 - "Customer Support and Refunds"
Cohesion: 0.16
Nodes (15): customer_refund_updates_target, orders_refund_history, public.create_customer_ticket(), public.customer_refund_history, public.customer_refund_updates, public.support_messages, public.support_ticket_requests, public.support_tickets (+7 more)

### Community 48 - "Rider Schedule Validation"
Cohesion: 0.21
Nodes (9): DaySchedule, isWithinSchedule(), monday0859ist, monday10ist, monday1800ist, monday20ist, mondayOff, normalized (+1 more)

### Community 51 - "Weekly Payout Processing"
Cohesion: 0.06
Nodes (36): pruneAuthBudgets(), closeDatabaseConnections(), computeWeeklyPayouts(), runWeeklyPayoutJob(), computeWeeklyRiderPayouts(), runWeeklyRiderPayoutJob(), previousWeekRange(), WeekRange (+28 more)

### Community 53 - "Payment Preference Management"
Cohesion: 0.31
Nodes (7): getPaymentPreference(), METHODS, normalizePaymentPreference(), savePaymentPreference(), selectPaymentPreference(), mocks, query()

### Community 57 - "Product Popularity and Inventory"
Cohesion: 0.13
Nodes (11): inventory_release_variant, orders_delivered_popularity, product_popularity_store_day, product_variants_active_reservations, public.approve_failed_trip_refund(), public.popular_customer_product_ids(), public.product_popularity_daily, public.protect_reserved_variant() (+3 more)

### Community 58 - "Checkout Feature Roadmap"
Cohesion: 0.25
Nodes (8): Checkout Eligibility and Inventory, Checkout Pricing Contract, Checkout Attempts and Payment Recovery, Customer Experience Hardening, Store Privacy, Delivery Proof and Atomic Financial Effects, Customer Payments - Cashfree, Tracking and Customer Multi-shop Cancellation, Product Pack Checkout

### Community 62 - "Rider Cancellation Reasons"
Cohesion: 0.32
Nodes (4): CODES, isRiderCancelReasonCode(), RIDER_CANCEL_REASON_CODES, RiderCancelReasonCode

### Community 63 - "Delivery Failure Reasons"
Cohesion: 0.32
Nodes (4): CODES, isRiderDeliveryFailureReasonCode(), RIDER_DELIVERY_FAILURE_REASON_CODES, RiderDeliveryFailureReasonCode

### Community 65 - "Core Database Schema"
Cohesion: 0.17
Nodes (15): addresses, order_items, orders, payouts, products, rider_earnings, riders, stores (+7 more)

### Community 66 - "Background Worker Jobs"
Cohesion: 0.15
Nodes (12): orders_delivered_settlement_idx, orders_dispatch_due_idx, payout_release_due_idx, public.advance_dispatch_offers(), public.background_worker_ready(), public.claim_payout_releases(), public.claim_scheduled_work(), public.compute_store_payouts() (+4 more)

### Community 67 - "Atomic Financial Transactions"
Cohesion: 0.18
Nodes (11): atomic_refund_intent, atomic_rider_earning, atomic_trip_refund, order_refund_jobs_age, order_refund_jobs_due, orders_refund_history, public.claim_order_refunds(), public.order_refund_jobs (+3 more)

### Community 70 - "Store Discovery and Deals"
Cohesion: 0.14
Nodes (10): products_store_category_idx, products_store_deals_idx, products_store_price_idx, public.deal_customer_product_ids(), public.nearby_customer_stores(), public.popular_customer_product_ids(), public.store_category_facets(), public.store_product_page_ids() (+2 more)

### Community 74 - "Legacy Schema and Metadata"
Cohesion: 0.17
Nodes (10): orders_order_number_unique, public.categories, public.category_sections, public.home_tab_banners, public.home_tab_tiles, public.home_tabs, public.product_variants, public.store_onboarding_drafts (+2 more)

### Community 75 - "Payment Reconciliation and Reservations"
Cohesion: 0.17
Nodes (3): public.claim_checkout_expiry_reconciliation(), public.expire_checkout_reservation_batch(), public.settle_checkout_payment()

### Community 77 - "Delivery Code Security"
Cohesion: 0.18
Nodes (7): delivery_codes_expiry, private_delivery_code, public.complete_verified_delivery(), public.customer_delivery_codes(), public.delivery_code_resets, public.delivery_codes, public.prune_delivery_codes()

### Community 78 - "Home Content Management"
Cohesion: 0.28
Nodes (10): home_content_audit, home_content_revision, home_content_tab_sync, home_tab_content_sync, public.audit_home_content(), public.home_content, public.home_content_history, public.revise_home_content() (+2 more)

### Community 80 - "Promotion and Receipt Snapshots"
Cohesion: 0.18
Nodes (6): order_items_receipt_snapshot, orders_release_unpaid_promotion, promo_redemptions_final_guard, public.guard_promo_redemption(), public.snapshot_receipt_product(), trips_release_unpaid_promotion

### Community 81 - "Security and Checkout Policy"
Cohesion: 0.67
Nodes (3): Authentication Policy, Server-Owned Checkout and Merchant Approval, Security Patch Review

### Community 97 - "Product Search and Discovery"
Cohesion: 0.16
Nodes (15): products_category_browse, products_search_name_trgm, products_search_words, public.browse_customer_product_ids(), public.customer_category_facets(), public.search_customer_product_ids(), products_browse_approved_store_id_idx, public.browse_collection_ids() (+7 more)

### Community 98 - "Checkout Eligibility Logic"
Cohesion: 0.21
Nodes (10): addresses, order_items, orders, product_variants, products, promo_codes, promo_redemptions, stores (+2 more)

### Community 99 - "Order Variant Snapshots"
Cohesion: 0.20
Nodes (5): create_order(), create_trip_orders(), order_items_snapshot_variant, order_items_variant_id_idx, public.snapshot_order_item_variant()

### Community 100 - "Payment Recovery Sessions"
Cohesion: 0.21
Nodes (6): orders_pending_checkout_idx, public.checkout_attempts, public.checkout_payment_sessions, public.claim_checkout_payment(), public.close_checkout_attempt(), public.create_checkout_attempt()

### Community 101 - "Customer Push Notifications"
Cohesion: 0.29
Nodes (9): customer_notifications_due, customer_notifications_page, customer_order_notification, customer_push_devices_customer, public.claim_customer_notifications(), public.customer_notifications, public.customer_push_devices, public.record_customer_order_notification() (+1 more)

### Community 103 - "Trip Cancellation Refunds"
Cohesion: 0.27
Nodes (5): public.cancel_customer_trip(), public.claim_trip_refunds(), public.enqueue_trip_refund(), public.trip_refunds, trip_refunds_due

### Community 104 - "Inventory Signal Sync"
Cohesion: 0.29
Nodes (5): inventory_signals_expiry, public.capture_inventory_signal(), public.inventory_signals, public.prune_inventory_signals(), scoped_inventory_signal

### Community 105 - "Unpaid Reservation Expiry"
Cohesion: 0.27
Nodes (5): orders_trip_unpaid_expiry_idx, orders_unpaid_expiry_idx, public.background_worker_ready(), public.expire_checkout_reservation_batch(), trips_unpaid_expiry_idx

### Community 106 - "Commerce Security Policies"
Cohesion: 0.22
Nodes (3): auth.sessions, auth.users, public.users

### Community 107 - "Rider Payout Schema"
Cohesion: 0.36
Nodes (5): rider_earnings_order_unique, rider_earnings_trip_unique, rider_earnings_unpaid, rider_payouts, rider_payouts_rider_week_unique

### Community 108 - "Auth Abuse Prevention"
Cohesion: 0.36
Nodes (5): addresses_one_active_default, auth_abuse_windows_expiry, public.auth_abuse_windows, public.manage_customer_address(), public.prune_auth_budgets()

### Community 109 - "Store Review Totals"
Cohesion: 0.32
Nodes (4): maintain_store_review_totals, public.maintain_store_review_totals(), public.validate_customer_review(), validate_customer_review

### Community 110 - "Media Asset Cleanup"
Cohesion: 0.36
Nodes (4): media_assets_owner_private_idx, media_assets_recovery_idx, public.claim_media_cleanup(), public.media_assets

### Community 111 - "Promotional Delivery Queue"
Cohesion: 0.39
Nodes (5): promotional_delivery_expiry, promotional_delivery_leases, promotional_delivery_queue, public.claim_promotional_deliveries(), public.promotional_deliveries

### Community 112 - "Variant Checkout Schema"
Cohesion: 0.39
Nodes (7): order_items, orders, product_variants, products, promo_codes, promo_redemptions, trips

### Community 113 - "Capacity Observability Metrics"
Cohesion: 0.29
Nodes (3): customer_notifications_unsent_metrics_idx, public.capacity_sample, trip_refunds_pending_metrics_idx

### Community 114 - "Repeat Purchase Analytics"
Cohesion: 0.38
Nodes (3): order_items_repeat_candidates_idx, orders_delivered_repeat_cursor_idx, public.repeat_purchase_candidates()

### Community 119 - "Store Discovery Search"
Cohesion: 0.47
Nodes (3): public.nearby_customer_stores(), stores_location_gist, stores_zone_radius_idx

### Community 122 - "Supabase Bootstrap Schema"
Cohesion: 0.40
Nodes (4): auth.sessions, auth.users, storage.buckets, storage.objects

### Community 135 - "Payout History Pagination"
Cohesion: 0.40
Nodes (4): public.payouts, public.reviews, public.rider_earnings, public.rider_payouts

### Community 138 - "Customer Support and Experience"
Cohesion: 0.50
Nodes (3): customer_push_devices, support_tickets, wishlist_items

### Community 259 - "Payment and Order Creation"
Cohesion: 0.09
Nodes (55): createOrder(), CreateOrderInput, createUpiCollectPayment(), createUpiIntentPayment(), fetchPaymentPreference(), fetchPendingPayments(), PaymentRecovery, PaymentTarget (+47 more)

### Community 260 - "User Account and Profile"
Cohesion: 0.03
Nodes (127): createAddress(), updateAddress(), fetchAccountInfo(), selectPaymentPreference(), AppIcon(), Props, BrandFooter(), Props (+119 more)

### Community 261 - "App Navigation and Screens"
Cohesion: 0.06
Nodes (69): Props, AccountPrivacyScreen(), DeletionRequest, Props, Stack, AppStackParamList, AboutGloceriesScreen(), DEFAULT_BODY (+61 more)

### Community 262 - "Category and Product Browsing"
Cohesion: 0.10
Nodes (37): ALL_TAB, CategoryDetailContent(), CategoryDetailScreen(), ContentProps, Props, CategoryProductPane(), Props, Props (+29 more)

### Community 263 - "Geocoding and Location Services"
Cohesion: 0.08
Nodes (41): DismissKeyboardView(), PrimaryButton(), Coordinates, distanceKm(), fetchNearbyPlaces(), formatDistance(), geocodeAddress(), getCurrentCoordinates() (+33 more)

### Community 264 - "Delivery Settings and Inventory Cache"
Cohesion: 0.09
Nodes (34): DEFAULT_DELIVERY_SETTINGS, DeliverySettings, fetchDeliverySettings(), useDeliverySettings(), useDeliverySettingsSync(), FreeDeliveryProgressCard(), Props, homeInventory (+26 more)

### Community 265 - "API Client and Auth"
Cohesion: 0.12
Nodes (19): submitAreaUpvote(), refreshSession(), savePushToken(), verifyOtp(), VerifyOtpResult, apiRequest(), RequestTimeoutError, ValidatePromoResult (+11 more)

### Community 267 - "Product Detail UI"
Cohesion: 0.10
Nodes (36): CartBar(), ProductDetailFooter(), Props, AndroidProductDetailContent(), Card(), CardProps, EMPTY_PRODUCTS, GROW_EASING (+28 more)

### Community 268 - "Home Banners and Images"
Cohesion: 0.04
Nodes (54): fetchOrderHistoryStatuses(), AppImage(), Props, RESIZE_MODE_TO_CONTENT_FIT, publicImageFallback(), DEFAULT_BANNER_URI, HomeCategoryBanner(), ContentImage() (+46 more)

### Community 269 - "Product Wishlist"
Cohesion: 0.09
Nodes (35): addToWishlist(), ApiWishlistItem, fetchWishlist(), mapWishlistToProducts(), removeFromWishlist(), IconlyBookmark(), IconlyBookmarkFilled(), Props (+27 more)

### Community 271 - "Inventory and Store Discovery"
Cohesion: 0.13
Nodes (22): Page, useCollectionInventory(), inventoryPreviewQuery(), PreviewTab, warmInventoryPreviews(), useWarmHomeBrowse(), ApiNearestStore, useNearbyStores() (+14 more)

### Community 272 - "Order and Trip Tracking"
Cohesion: 0.18
Nodes (22): fetchOrder(), fetchOrderLive(), fetchTripLive(), OrderLive, TripLive, fetchTrip(), DetailRefreshGate, detailRefreshKey() (+14 more)

### Community 273 - "Festival Offers and Collections"
Cohesion: 0.12
Nodes (17): FESTIVAL_PRODUCT_GROUPS, collections, FESTIVAL_OFFER_CARD_WIDTH, FESTIVAL_OFFER_LIMIT, hasGenuineDiscount(), FLOWER_PRODUCT_GROUPS, flowerPreviewArtwork(), FLOWER_PREVIEW_PRODUCTS (+9 more)

### Community 274 - "Order Bill Calculation"
Cohesion: 0.31
Nodes (8): ApiOrderItem, buildOrderSummary(), SummaryItem, useOrderSummary(), calculateOrderBill(), roundMoney(), StoredBill, Props

### Community 275 - "Order Cancellation and Refunds"
Cohesion: 0.17
Nodes (18): cancelOrder(), cancelTrip(), CreateTripItem, TripCancellation, TripRefund, CancelOrderCard(), CancelOrderModal(), clockTime() (+10 more)

### Community 277 - "Address and Cart Management"
Cohesion: 0.12
Nodes (25): ApiAddress, CreateAddressInput, deleteAddress(), fetchAddresses(), setDefaultAddress(), validatePromoCode(), AddressListScreen(), handleSelect() (+17 more)

### Community 278 - "Customer Auth and Notifications"
Cohesion: 0.06
Nodes (59): requestOtp(), fetchOrderHistory(), PhoneInput(), Props, clearAccountCache(), customerIdFromToken(), resetAccountData(), CustomerNotification (+51 more)

### Community 279 - "Home Category UI"
Cohesion: 0.06
Nodes (56): HomeCategoryContent(), homeCategoryKind(), HomeCategoryScreen(), PosterBanner(), Props, CategoryTabItem(), Props, styles (+48 more)

### Community 280 - "App Configuration and Copy"
Cohesion: 0.05
Nodes (59): AppConfig, DEFAULT_APP_CONFIG, fetchAppConfig(), resolveCopy(), useAppConfig(), useCopy(), useCopyText(), dedupeById() (+51 more)

### Community 281 - "Cart and Bill Details"
Cohesion: 0.10
Nodes (26): CartAvailability, CheckoutQuote, BarcodeSvg(), BarSegment, computeBars(), Props, PriceText(), Props (+18 more)

### Community 283 - "API Base URL"
Cohesion: 0.38
Nodes (3): API_BASE_URL, isLocalHost(), resolveApiBaseUrl()

### Community 284 - "App Navigation Shell"
Cohesion: 0.07
Nodes (35): BottomNavBar(), Props, ROUTE_TO_TAB_ID, BottomNavBarItem(), BOTTOM_NAV_TABS, HomeNavigationProgressContext, HomeNavigationShell(), Props (+27 more)

### Community 286 - "API Client and Product Mapping"
Cohesion: 0.13
Nodes (24): ApiRequestOptions, doRefresh(), refreshAccessToken(), REQUEST_TIMEOUT_MS, ApiProduct, ApiVariant, formatVariant(), inventoryIssue() (+16 more)

### Community 289 - "Order Reviews API"
Cohesion: 0.30
Nodes (10): ApiReview, fetchReviewForOrder(), submitReview(), OrderProductPreview(), OrderRow(), statusFor(), RateOrderModal(), handleSubmit() (+2 more)

### Community 290 - "Customer Support and Refunds"
Cohesion: 0.12
Nodes (43): createTicket(), getRefund(), getRefunds(), getSupportOrders(), getThread(), getTickets(), ISSUE_LABELS, IssueCategory (+35 more)

### Community 294 - "UI Gradients and Styling"
Cohesion: 0.21
Nodes (12): CategoryHeaderGradient, gradient(), GRADIENT_BY_TAB_NAME, gradientForTabName(), STOPS, BEST_DEALS_GRADIENT, CARD_TINT_BY_SPOTLIGHT_KEY, GRADIENT_BY_SPOTLIGHT_KEY (+4 more)

### Community 296 - "Order History API"
Cohesion: 0.16
Nodes (12): CreateOrderItem, fetchBuyItAgain(), fetchMyOrders(), OrderHistoryPage, OrderHistoryStatus, accountQueryClient(), AccountResetOptions, client (+4 more)

### Community 299 - "Order Tracking Timeline"
Cohesion: 0.20
Nodes (14): ApiOrder, Props, Props, CIRCLE_STYLE, Props, StepState, TimelineStep(), formatTime() (+6 more)

### Community 300 - "Error Handling and Reporting"
Cohesion: 0.16
Nodes (7): ErrorBoundary, Props, State, beforeSend(), captureRenderError(), withCrashReporting, sanitizeErrorText()

### Community 301 - "Store Discovery UI"
Cohesion: 0.07
Nodes (42): useDeliveryEstimateMinutes(), prefetchImages(), Props, StoreTile, StoreTileCard(), NearbyStoresSection(), NewOnGloceriesSection(), Props (+34 more)

### Community 306 - "Kitchen and Local Brands"
Cohesion: 0.16
Nodes (12): KITCHEN_GROUPS, KITCHEN_PREVIEW_PRODUCTS, LocalPantryBrand, PREVIEW_LOCAL_BRANDS, VERIFIED_LOCAL_BRANDS, DISTRICT_BRAND_COLLECTIONS, DISTRICT_BRAND_PREVIEWS, DistrictBrandCollection (+4 more)

### Community 310 - "Category UI Components"
Cohesion: 0.31
Nodes (9): CategorySectionGroup(), Props, CategorySections(), CategoryTile(), Props, ApiCategorySection, RemoteCategory, RemoteCategorySection (+1 more)

### Community 311 - "Receipt Generation UI"
Cohesion: 0.32
Nodes (6): ReceiptScreen(), shareReceipt(), buildReceiptText(), ReceiptInput, ReceiptLine, rupees()

### Community 313 - "Festival Greeting UI"
Cohesion: 0.29
Nodes (8): FestivalGreetingPanel(), FestivalScallopEdge(), Props, scallopCount(), FestivalGreeting, useFestivalGreeting(), useFestivalProducts(), useHomeSections()

### Community 314 - "VPA Payment Management"
Cohesion: 0.30
Nodes (12): validateVpa(), canPayWithVpa(), initialVpaState(), isVpaFormatValid(), loadRememberedVpa(), normalizeVpa(), VpaEvent, vpaReducer() (+4 more)

### Community 317 - "Fresh Produce Collections"
Cohesion: 0.15
Nodes (14): VEGETABLE_GROUPS, VEGETABLE_PREVIEW_PRODUCTS, FRUIT_GROUPS, FRUIT_PREVIEW_PRODUCTS, HomeGrower, PREVIEW_HOME_GROWERS, VERIFIED_HOME_GROWERS, PRODUCE_GROUPS (+6 more)

### Community 319 - "Order Status Mapping"
Cohesion: 0.31
Nodes (8): formatRelativeDateTime(), mapOrderGroup(), OrderItemSummary, STATUS_LABEL, joinStoreNames(), representativeLeg(), STAGE_ORDER, stageIndex()

### Community 322 - "Bottom Navigation UI"
Cohesion: 0.36
Nodes (7): ICON_BY_TAB, Props, NavTab, IconlyBag, IconlyCategory, IconlyHome, IconlyIconProps

### Community 327 - "Delivery Arrival Estimates"
Cohesion: 0.24
Nodes (9): Detail(), OrderSummaryDetailsCard(), OrderSummary, Props, PurchaseOrder, getPurchaseArrivalDeadline(), getPurchaseArrivalLabel(), arrivalDeadline() (+1 more)

### Community 330 - "Checkout Quote API"
Cohesion: 0.47
Nodes (6): fetchCartAvailability(), fetchCheckoutQuote(), useCartAvailability(), useCheckoutActivity(), useCheckoutQuote(), checkoutItems()

### Community 333 - "Barcode Encoding"
Cohesion: 0.29
Nodes (4): BarcodeEncoder, BarcodeEncoderConstructor, BarcodeEncodeResult, jsbarcode/src/barcodes

### Community 341 - "UI Components and Navigation"
Cohesion: 0.06
Nodes (60): AppIcon(), AppImage(), Props, RESIZE_MODE_TO_CONTENT_FIT, BottomNavBar(), BottomNavBarItem(), Props, BOTTOM_NAV_TABS (+52 more)

### Community 342 - "Store Location and Drafts"
Cohesion: 0.07
Nodes (52): saveStoreDraft(), DismissKeyboardView(), PrimaryButton(), Props, Coordinates, fetchSuggestedLabels(), getCurrentCoordinates(), LocationPermissionDeniedError (+44 more)

### Community 343 - "Order Tracking and Earnings"
Cohesion: 0.06
Nodes (48): ApiOrder, ApiOrderItem, fetchOrders(), updateOrderStatus(), DeliveryEarnedBanner(), ActiveEarning, DeliveryEarnedAlertState, useDeliveryEarnedAlertStore (+40 more)

### Community 344 - "Product Management API"
Cohesion: 0.06
Nodes (45): deleteProductApi(), updateProductApi(), UpdateProductBody, uploadProductPhoto(), API_URL, apiRequest, client, doRefresh() (+37 more)

### Community 345 - "Payout Management"
Cohesion: 0.09
Nodes (44): ApiPayout, ApiPayoutOrder, fetchPayoutAccount, fetchPayoutOrderPage(), fetchPayoutOrders(), fetchPayoutPage(), fetchPayouts(), PAYOUT_ACCOUNT_QUERY_KEY (+36 more)

### Community 346 - "Payout Proof and Image Compression"
Cohesion: 0.08
Nodes (33): uploadPayoutProof(), BrandFooter(), CompressedImage, compressImageToTarget(), estimateBytes(), AccountSummary(), Field(), PayoutAccountCard() (+25 more)

### Community 349 - "Store Onboarding and Auth"
Cohesion: 0.07
Nodes (40): authApi, checkAccountStatus(), RequestOtpResult, SavedStoreDraft, savePushToken(), StoreApplication, StoreDraftPatch, submitStoreApplication() (+32 more)

### Community 352 - "User Onboarding and Login"
Cohesion: 0.14
Nodes (15): requestOtp(), OtpBoxInput(), Props, PhoneInput(), Props, LoginScreen(), handleContinue(), Props (+7 more)

### Community 353 - "Partner Onboarding Flow"
Cohesion: 0.32
Nodes (6): fetchStoreDraft(), StoreDraft, EMPTY_DRAFT, OnboardingIntroScreen(), handleGetStarted(), Props

### Community 354 - "Order Alert Audio"
Cohesion: 0.33
Nodes (6): boostToMaxVolume(), ensureAudioMode(), playOrderAlertSound(), primeOrderAlertSound(), scheduleVolumeRestore(), VolumeManagerModule

### Community 360 - "Rider Dispatch and Routing"
Cohesion: 0.05
Nodes (57): fetchRoute(), RouteInfo, acceptDispatchOffer(), updateRiderStatus(), BackendOrderStatus, fetchAssignments(), RawAssignment, RawOrderItem (+49 more)

### Community 361 - "Rider Profile and Performance"
Cohesion: 0.08
Nodes (38): fetchRiderProfile(), RiderProfile, RiderProfilePayout, fetchRiderStats(), RiderStats, AppIcon(), PerformanceRow(), Props (+30 more)

### Community 362 - "Order Mocking and UI Components"
Cohesion: 0.07
Nodes (44): Props, CountdownRing(), Props, CUSTOMER_AREAS, CUSTOMER_NAMES, generateMockOrder(), generateMockRating(), generateOrderItems() (+36 more)

### Community 363 - "Rider Earnings Dashboard"
Cohesion: 0.10
Nodes (35): apiRequest, EarningDay, fetchRiderEarningPage(), fetchRiderEarnings(), fetchRiderEarningSummary(), RiderEarning, EarningsPeriod, EarningsSummaryCard() (+27 more)

### Community 364 - "Dispatch and Map Integration"
Cohesion: 0.09
Nodes (36): AcceptDispatchOfferResult, coordsOf(), DISPATCH_OFFER_WINDOW_MS, DispatchOffer, fetchDispatchOffers(), RawDispatchOffer, toDispatchOffer(), Coordinates (+28 more)

### Community 366 - "Delivery History and Navigation"
Cohesion: 0.11
Nodes (30): useActiveMsToday(), useElapsedMs(), AppStackParamList, AppTabParamList, ActiveDeliveryCard(), DeliveryHistoryRow(), DeliveryFilter, FilterChipRow() (+22 more)

### Community 367 - "Device Auth and Push Tokens"
Cohesion: 0.08
Nodes (30): AccountStatus, fetchAccountStatus(), savePushToken(), verifyOtp(), VerifyOtpResult, OtpBoxInput(), Props, registerPushToken() (+22 more)

### Community 368 - "Rider Bank Details and Payouts"
Cohesion: 0.08
Nodes (22): fetchPayoutAccount, fetchRiderPayoutPage(), fetchRiderPayouts(), RIDER_PAYOUT_ACCOUNT_QUERY_KEY, RiderPayout, RiderPayoutStatus, savePayoutAccount, BankDetailsScreen() (+14 more)

### Community 369 - "Availability and Authentication"
Cohesion: 0.11
Nodes (25): DaySchedule, defaultWeek(), fetchAvailability(), saveAvailability(), API_URL, client, doRefresh(), refreshAccessToken() (+17 more)

### Community 370 - "Rider Notifications and Navigation"
Cohesion: 0.14
Nodes (21): fetchNotifications(), markNotificationsRead(), RiderNotification, RiderNotificationType, BottomNavBar(), BottomNavBarItem(), Props, BOTTOM_NAV_TABS (+13 more)

### Community 371 - "Rider Onboarding Process"
Cohesion: 0.06
Nodes (70): requestOtp(), fetchRiderDraft(), RiderApplication, RiderDocumentKind, RiderDraftPatch, SavedRiderDraft, saveRiderDraft(), submitRiderApplication() (+62 more)

### Community 378 - "UI Error Boundary"
Cohesion: 0.29
Nodes (3): ErrorBoundary, Props, State

### Community 380 - "Inventory and Stock Management"
Cohesion: 0.08
Nodes (38): InventoryPage(), STOCK_LABELS, STOCK_STYLES, AddProductModal(), handleAdd(), makeEmptyDraft(), STOCK_OPTIONS, EditProductModal() (+30 more)

### Community 381 - "Home Tab Configuration API"
Cohesion: 0.08
Nodes (43): DELETE(), POST(), DELETE(), PATCH(), POST(), DELETE(), PATCH(), POST() (+35 more)

### Community 382 - "Admin API Routes"
Cohesion: 0.05
Nodes (25): PATCH(), PATCH(), UserRow, clean(), HomeSectionRow, PUT(), GET(), istMidnightUtcIso() (+17 more)

### Community 383 - "Store Management API"
Cohesion: 0.10
Nodes (32): PATCH(), GET(), POST(), StoreDetailPage(), Section(), StoreDetailForm(), change(), field() (+24 more)

### Community 384 - "Category Management API"
Cohesion: 0.33
Nodes (11): PATCH(), POST(), CategoryRow, CategoryWriteInput, toCategoryErrorMessage(), toCategoryRow(), validateCategoryInput(), CATEGORY_SELECT (+3 more)

### Community 385 - "Rider and Store Approvals"
Cohesion: 0.19
Nodes (18): GET(), signPhotoUrls(), GET(), ApplicationReviewPage(), Field(), loadApplication(), signRiderPhotos(), DecisionButtons() (+10 more)

### Community 386 - "Home Content Editor"
Cohesion: 0.11
Nodes (11): HomeContentPage(), CatalogueItem, CataloguePicker(), Field(), inputClass, Toggle(), HistoryEntry, HomeContentEditor() (+3 more)

### Community 387 - "Admin Overview and Analytics"
Cohesion: 0.13
Nodes (26): OverviewPage(), OverviewStats, AppDownloadsCard(), PLATFORM_ROWS, angleForValue(), bandPath(), BANDS, CompletionGauge() (+18 more)

### Community 388 - "Admin Auth and Payout Routes"
Cohesion: 0.10
Nodes (27): POST(), POST(), GET(), GET(), POST(), POST(), GET(), PayeeRow (+19 more)

### Community 389 - "Customer and Promo Code Admin"
Cohesion: 0.08
Nodes (23): CustomerRow, CustomersPage(), DraftForm, EMPTY_DRAFT, Field(), formatExpiry(), PromoCodesPage(), matchesFilter() (+15 more)

### Community 390 - "Admin Order and Customer Management"
Cohesion: 0.08
Nodes (36): OrderRow, STATUS_TIMESTAMP_COLUMN, CustomerDetail, CustomerDetailPage(), FailedDeliveriesPage(), formatDate(), STATUS_STYLE, OrdersPage() (+28 more)

### Community 391 - "Admin App Content Management"
Cohesion: 0.14
Nodes (18): adminUser(), GET(), PUT(), AppContentPage(), CopyRow, Field(), REGISTERED, toRows() (+10 more)

### Community 392 - "Media Upload and Processing"
Cohesion: 0.09
Nodes (14): POST(), storePublicImage(), boundedForm(), UploadBodyTooLarge, generateProductBgColor(), hslToHex(), hueToRgb(), rgbToHsl() (+6 more)

### Community 393 - "Admin Content Management"
Cohesion: 0.08
Nodes (20): CategoriesPage(), folders, MediaPage(), StoresPage(), AddCategoryModal(), EditCategoryModal(), SectionTitlesBar(), SubCategoryManager() (+12 more)

### Community 395 - "Admin Operations and Deletions"
Cohesion: 0.10
Nodes (26): POST(), GET(), POST(), FailedDeliveryOrder, FailedOrderRow, GET(), dynamic, GET() (+18 more)

### Community 396 - "Category and Auth Routes"
Cohesion: 0.11
Nodes (20): POST(), PATCH(), POST(), LoginForm(), LoginPage(), SubCategoryRow, SubCategoryWriteInput, toSubCategoryRow() (+12 more)

### Community 397 - "Application Approval Workflow"
Cohesion: 0.09
Nodes (23): ApprovalsPage(), TabKind, TABS, ApplicationRow(), STATUS_STYLES, DocRow, DocRowItem(), DocStatus (+15 more)

### Community 398 - "Rider Status API"
Cohesion: 0.48
Nodes (4): GET(), RiderRow, DaySchedule, isWithinSchedule()

### Community 399 - "Promo Code Management"
Cohesion: 0.29
Nodes (12): PATCH(), GET(), POST(), PromoCodeRow, PromoCodeWriteInput, toPromoCodeErrorMessage(), toPromoCodeRow(), validatePromoCodeInput() (+4 more)

### Community 400 - "Refund Management Page"
Cohesion: 0.29
Nodes (5): CANCEL_REASON_LABELS, cancelReasonLabel(), RefundsPage(), STATUS_STYLE, CASHFREE_DASHBOARD_URL

### Community 402 - "Dashboard Layout Navigation"
Cohesion: 0.25
Nodes (9): DashboardLayout(), Sidebar(), TEAM_AVATAR_COLORS, TopNav(), ALL_NAV_ITEMS, INSIGHTS_ITEMS, MENU_ITEMS, NavItem (+1 more)

### Community 404 - "Customer Support Inbox"
Cohesion: 0.22
Nodes (8): SupportPage(), call(), Conversation(), send(), Message, SupportInbox(), SupportRequestError, Ticket

### Community 405 - "Rider and Zone Management"
Cohesion: 0.15
Nodes (17): DAY_LABELS, hoursSummary(), PRESENCE_LABELS, RidersPage(), TABS, ZonesPage(), AssignRiderRow(), Props (+9 more)

### Community 407 - "Support Ticket API"
Cohesion: 0.49
Nodes (8): Context, GET(), POST(), GET(), supportAdmin(), supportFailure(), supportId(), supportPage()

### Community 411 - "App Root Layout"
Cohesion: 0.33
Nodes (5): metadata, sohne, sohneBreit, sohneMono, sohneSchmal

### Community 412 - "Home Content API"
Cohesion: 0.29
Nodes (6): authorize(), Context, dynamic, GET(), PUT(), record()

### Community 413 - "Home Section Editor"
Cohesion: 0.29
Nodes (4): HomeSection, HomeSectionsPage(), labelFor(), SECTION_META

### Community 415 - "Customer Deletion Requests"
Cohesion: 0.43
Nodes (5): CustomerDeletionsPage(), DeletionInbox(), load(), review(), RequestRow

### Community 416 - "Inventory Stock Editor"
Cohesion: 0.38
Nodes (3): PackStockPage(), PackStockEditor(), Product

### Community 419 - "Festival Greeting API"
Cohesion: 0.40
Nodes (4): coerceCategories(), FestivalGreetingRow, GreetingCategory, PATCH()

### Community 420 - "Festival Greeting Management"
Cohesion: 0.33
Nodes (3): FestivalGreeting, FestivalGreetingPage(), GreetingCategory

### Community 424 - "Store Admin Management"
Cohesion: 0.67
Nodes (3): PATCH /store Route, Admin Store Editing, store-images Storage Bucket

## Knowledge Gaps
- **979 isolated node(s):** `InventoryScope`, `CacheEntry`, `Bucket`, `DeliveredOrderItem`, `ProductRow` (+974 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1774 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **179 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `Purchase History and Testing` to `Auth Session and Stream Management`, `Project Dependencies and Config`, `Order Refund Processing`, `Request Admission Control`, `Dev Server and Migrations`, `Supabase Auth Integration`, `Home Content Management`, `Product Pagination and Variants`, `Testing and Metrics Infrastructure`, `Environment and Geocoding Config`, `Checkout Quotes and Pricing`, `Order Expiry Management`, `Cart State Management`, `Collection Browsing Rules`, `Checkout Recovery Storage`, `Auth and Privacy Backend`, `API Base URL`, `Inventory Warmup Tests`, `Live Order Tracking`, `Admin Upload Tests`, `Checkout Catalog and Availability`, `Secure Account Storage`, `Realtime Stream Management`, `Inventory Cache Tests`, `Weekly Payout Processing`, `Payment Preference Management`, `Admin Store API`, `Store Management Tests`, `Delivery Estimate Tests`, `Rider Cancellation Reasons`, `Delivery Failure Reasons`, `Delivery Settings Tests`, `Auth Recovery Tests`, `Purchase History Cache`, `Notification Navigation Tests`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **What connects `InventoryScope`, `CacheEntry`, `Bucket` to the rest of the system?**
  _979 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Auth Session and Stream Management` be split into smaller, more focused modules?**
  _Cohesion score 0.06918238993710692 - nodes in this community are weakly interconnected._
- **Why does `AppError` connect `Auth and Privacy Backend` to `Project Dependencies and Config`, `Checkout Catalog and Availability`, `Request Admission Control`, `Supabase Auth Integration`, `Product Pagination and Variants`, `Environment and Geocoding Config`, `Checkout Quotes and Pricing`, `Order Expiry Management`, `Payment Preference Management`, `Collection Browsing Rules`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `Project Dependencies and Config` be split into smaller, more focused modules?**
  _Cohesion score 0.05858585858585859 - nodes in this community are weakly interconnected._
- **Why does `products()` connect `Product Search and Discovery` to `Store Discovery and Deals`, `Festival Section Products`, `User Wishlist Management`, `Promotion and Receipt Snapshots`, `Repeat Purchase Analytics`, `Collection Browsing Rules`, `Product Popularity and Inventory`, `Payment and Refund Processing`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Should `Product Approval and Festival Sections` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._