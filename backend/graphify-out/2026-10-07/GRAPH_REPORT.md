# Graph Report - backend  (2026-10-07)

## Corpus Check
- 427 files · ~740,360 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 2, .example 1)

## Summary
- 2140 nodes · 4108 edges · 259 communities (93 shown, 166 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 97 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `502c45ea`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Stream Admission Control
- Project Dependencies
- publicImages.ts
- tripRefunds.ts
- src/index.ts
- Python Automation Scripts
- Network and Port Utilities
- authenticate.ts
- middleware/auth.ts
- webhook.ts
- checkoutEligibilityService.ts
- buyItAgain.ts
- products.ts
- runner.ts
- 026_add_missing_fk_indexes.sql
- Performance Metrics and Database
- payoutAccount.ts
- partner.ts
- AppError
- lib/trips.ts
- cashfreeClient.ts
- upi.ts
- collections.ts
- Customer Cart Storage
- 063_checkout_eligibility_inventory.sql
- checkoutQuote.test.ts
- 103_cashfree_payments.sql
- supabase
- rider.ts
- recovery.ts
- public.capacity_snapshot
- products
- Promotional Message Delivery
- Order and Trip Tracking
- vitest
- checkoutEligibility.ts
- expireUnpaidOrders.ts
- 085_push_receipts_account_deletion.sql
- 073_history_query_indexes.sql
- TypeScript Configuration
- ESLint Configuration
- customerAccountIsolation.test.ts
- riderDispatch.ts
- checkoutItems.test.ts
- Realtime Stream Subscriptions
- K6 Load Testing
- 066_customer_support_refunds.sql
- checkoutQuote.ts
- riderSchedule.selfcheck.ts
- notifications/router.ts
- jobs.ts
- Weekly Payout Processing
- Payment Preference Management
- Promo Code Validation
- appConfig.test.ts
- checkoutItems.ts
- 086_counted_pack_inventory_popularity.sql
- Checkout Eligibility and Inventory
- Admin Store Routes
- Order Cancellation Reasons
- Delivery Failure Reasons
- Server Lifecycle Management
- 001_init.sql
- 075_durable_background_workers.sql
- 080_atomic_order_financial_effects.sql
- Admin Delivery Settings
- 097_discovery_integrity.sql
- Customer Deletion Admin
- Purchase History Cache
- Notification Navigation
- 091_legacy_schema_prerequisites.sql
- public.settle_checkout_payment
- workers/index.ts
- 079_private_storefronts_delivery_codes.sql
- 059_home_content.sql
- Delivery OTP Verification
- 083_atomic_promos_receipt_snapshots.sql
- Server-Owned Checkout and Merchant Approval
- Manifest and Migrations
- Indexed Discovery and Durable Background Workers
- Tracking Policy
- Database Audit Findings
- Browse Visibility Policy
- Reservation Expiry and Capacity
- Bounded Catalogue Browsing
- Customer Care and Refund Visibility
- Customer Checkout Audit Follow-up
- Customer Inbox and Durable Notifications
- Checkout Snapshot Reuse and Bounded History
- Customer Inventory Synchronization
- Media Storage
- Promotional Delivery
- Backend Startup and Shutdown
- 093_persistent_browse_visibility.sql
- checkout-eligibility.sql
- 062_order_product_variants.sql
- 064_checkout_attempts_payment_recovery.sql
- 067_customer_notifications.sql
- security/admission.ts
- 065_trip_cancellation.sql
- 068_scoped_inventory_sync.sql
- 076_prompt_reservation_expiry.sql
- commerce-security.sql
- 050_rider_weekly_payouts.sql
- 082_customer_startup_addresses_auth.sql
- 088_atomic_customer_reviews.sql
- public.media_assets
- public.promotional_deliveries
- variant-checkout.sql
- 077_capacity_observability.sql
- public.repeat_purchase_candidates
- wishlist.test.ts
- trips
- promo_redemptions
- 061_delivery_estimate.sql
- 074_indexed_store_discovery.sql
- 087_checkout_delivery_address_snapshots.sql
- public.abandon_unpaid_checkout
- migration-bootstrap.sql
- notifications.test.ts
- reviews
- create_trip_orders
- create_trip_orders
- notifications
- order_items_snapshot_mrp
- public.request_auth_context
- tracking_live_revision
- public.request_auth_context_v2
- 072_bounded_collection_browse.sql
- 098_address_edit_failed_order_refunds.sql
- expiry-capacity.sql
- history-pagination.sql
- create_trip_orders
- referral_codes
- customer-experience.sql
- discovery-workers.sql
- festival_section_products
- wishlist_items
- addresses_active_idx
- 040_seasonal_section.sql
- rider_onboarding_drafts
- create_weekly_rider_payouts
- public.complete_verified_delivery
- auth-tracking.sql
- test_atomic_trip_earning
- checkout-attempts.sql
- 029_delivery_settings.sql
- 032_area_upvotes.sql
- 039_platform_settings.sql
- 056_festival_greeting.sql
- 058_home_sections.sql
- 100_app_content.sql
- scoped-inventory-sync.sql

## God Nodes (most connected - your core abstractions)
1. `AppError` - 164 edges
2. `vitest` - 103 edges
3. `express` - 84 edges
4. `supabase` - 78 edges
5. `AuthedRequest` - 39 edges
6. `requireAuth()` - 27 edges
7. `products()` - 24 edges
8. `requireRole()` - 23 edges
9. `logger` - 17 edges
10. `metrics` - 17 edges

## Surprising Connections (you probably didn't know these)
- `public.snapshot_receipt_product()` --reads_from--> `products()`  [EXTRACTED]
  backend/migrations/083_atomic_promos_receipt_snapshots.sql → backend/src/catalogue/collections.ts
- `public.store_product_page_ids()` --reads_from--> `products()`  [EXTRACTED]
  backend/migrations/097_discovery_integrity.sql → backend/src/catalogue/collections.ts
- `public.store_category_facets()` --reads_from--> `products()`  [EXTRACTED]
  backend/migrations/097_discovery_integrity.sql → backend/src/catalogue/collections.ts
- `public.deal_customer_product_ids()` --reads_from--> `products()`  [EXTRACTED]
  backend/migrations/097_discovery_integrity.sql → backend/src/catalogue/collections.ts
- `contentFor()` --calls--> `AppError`  [EXTRACTED]
  backend/src/catalogue/collections.ts → backend/src/lib/errors.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Financial Operations and Payout Lifecycle** — backend_payouts_manual_policy, backend_order_safety_policy, backend_payments_cashfree_policy, backend_discovery_and_workers_policy [EXTRACTED 0.90]
- **Checkout Flow Integrity and Security** — backend_checkout_eligibility_policy, backend_checkout_quotes_policy, backend_checkout_recovery_policy, backend_commerce_security_policy, backend_variant_checkout_policy [EXTRACTED 0.95]
- **System Observability and Capacity Management** — backend_capacity_and_expiry_policy, backend_discovery_and_workers_policy, backend_startup_shutdown_policy [INFERRED 0.85]

## Communities (259 total, 166 thin omitted)

### Community 0 - "Stream Admission Control"
Cohesion: 0.07
Nodes (33): StreamAdmission, streamLimit(), StreamWriter, writeStreamFrame(), HomeBroker, HomeEvent, InventoryScope, InventorySignal (+25 more)

### Community 1 - "Project Dependencies"
Cohesion: 0.04
Nodes (48): dependencies, @aws-sdk/client-s3, compression, express, node-cron, pino, pino-http, pino-pretty (+40 more)

### Community 2 - "publicImages.ts"
Cohesion: 0.08
Nodes (15): @aws-sdk/client-s3, allowed, apply, args, legacyBuckets, manifestPath, rows, Asset (+7 more)

### Community 3 - "tripRefunds.ts"
Cohesion: 0.13
Nodes (24): cashfreeRefundId(), CfRefund, OrderRefundJob, processOrderRefund(), runOrderRefunds(), save(), job, mocks (+16 more)

### Community 4 - "src/index.ts"
Cohesion: 0.07
Nodes (38): express, privacyRouter, agent, fetchWithAgent, supabaseAuth, app, proxyHops, toErrorBody() (+30 more)

### Community 5 - "Python Automation Scripts"
Cohesion: 0.13
Nodes (10): query(), success(), query(), drain(), query(), require(), sql(), sql() (+2 more)

### Community 6 - "Network and Port Utilities"
Cohesion: 0.08
Nodes (15): acquire(), nonce, port, portAvailable(), probeHost(), root, baselineIndex, directory (+7 more)

### Community 7 - "authenticate.ts"
Cohesion: 0.05
Nodes (49): @supabase/supabase-js, authenticate(), AuthRow, cacheTtl(), checkedContext(), Context, contexts, denied() (+41 more)

### Community 8 - "middleware/auth.ts"
Cohesion: 0.10
Nodes (25): AuthedRequest, requireApproved(), requireAuth(), requireRole(), addressesRouter, address, call(), handler() (+17 more)

### Community 9 - "webhook.ts"
Cohesion: 0.12
Nodes (18): pino, logger, loggerOptions, verifyWebhookSignature(), notifyStoresOfNewOrder(), settleCheckoutPayment(), mocks, enqueueTripRefund() (+10 more)

### Community 10 - "checkoutEligibilityService.ts"
Cohesion: 0.26
Nodes (11): loadCheckoutItems(), readCheckoutCatalog(), requirePackSnapshots(), mocks, loadCheckoutAvailability(), requireCheckoutEligibility(), requireCheckoutEligibilitySnapshot(), input (+3 more)

### Community 11 - "buyItAgain.ts"
Cohesion: 0.60
Nodes (3): DeliveredOrderItem, rankRepeatPurchases(), reorderByRank()

### Community 12 - "products.ts"
Cohesion: 0.15
Nodes (20): replaceProductVariants(), deriveStockStatus(), formatVariantUnit(), isFiniteNumber(), LOW_STOCK_THRESHOLD, ProductRow, ProductVariantRow, resolveEditImage() (+12 more)

### Community 13 - "runner.ts"
Cohesion: 0.31
Nodes (8): executeClaim(), Job, startPoller(), startQueueConsumer(), startWorker(), claim, rpc, WorkClaim

### Community 14 - "026_add_missing_fk_indexes.sql"
Cohesion: 0.07
Nodes (27): addresses_user_id_idx, addresses_zone_id_idx, festival_section_products_product_id_idx, home_tab_banners_home_tab_id_idx, order_items_order_id_idx, order_items_product_id_idx, orders_address_id_idx, orders_customer_id_idx (+19 more)

### Community 15 - "Performance Metrics and Database"
Cohesion: 0.16
Nodes (10): app, server, measureDatabaseFetch(), operation(), measureHttp(), BOUNDS, escape(), Labels (+2 more)

### Community 16 - "payoutAccount.ts"
Cohesion: 0.23
Nodes (14): assertProofUploaded(), bad(), parsePayoutAccountInput(), PAYOUT_ACCOUNT_COLUMNS, PayoutAccount, PayoutAccountInput, readPayoutAccount(), Row (+6 more)

### Community 17 - "partner.ts"
Cohesion: 0.12
Nodes (21): sharp, isValidFssaiFormat(), isValidPanFormat(), asValidationError(), ProductInput, storePrivateDocument(), storePublicImage(), assertNotLocked() (+13 more)

### Community 18 - "AppError"
Cohesion: 0.19
Nodes (15): Action, authBucket(), authBudget(), limits, mapsBudget(), AppError, payoutAccountBudget(), normalizePhone() (+7 more)

### Community 19 - "lib/trips.ts"
Cohesion: 0.21
Nodes (15): calculateCheckoutBill(), splitEarning(), calcCommission(), calcItemTotal(), calcNetPayout(), calcOrderTotal(), CartLine, DEFAULT_COMMISSION_RATE (+7 more)

### Community 20 - "cashfreeClient.ts"
Cohesion: 0.12
Nodes (25): call(), CallOptions, CASHFREE_API_VERSION, CashfreeError, CfPayment, CfPaymentStatus, CfPayResponse, createCfOrder() (+17 more)

### Community 21 - "upi.ts"
Cohesion: 0.13
Nodes (23): payCfOrder(), pickUpiLink(), upiLinksFrom(), verificationConfigured(), verifyCfVpa(), claimPayment(), ensureProviderOrder(), requirePaymentRetrySafe() (+15 more)

### Community 22 - "collections.ts"
Cohesion: 0.05
Nodes (28): BrowseRule, collectionRouter, contentFor(), pageSize(), PRICE_BANDS, STORE_SORTS, storePageFilters(), mocks (+20 more)

### Community 23 - "Customer Cart Storage"
Cohesion: 0.11
Nodes (3): fixture, fixture, item

### Community 24 - "063_checkout_eligibility_inventory.sql"
Cohesion: 0.09
Nodes (15): create_order(), create_trip_orders(), inventory_reservations_expiry_idx, inventory_reservations_order_idx, order_items_reserve_stock, orders_checkout_eligibility, orders_finish_inventory, products_tracked_inventory (+7 more)

### Community 25 - "checkoutQuote.test.ts"
Cohesion: 0.15
Nodes (4): items, settings, snapshot, request

### Community 26 - "103_cashfree_payments.sql"
Cohesion: 0.09
Nodes (11): public.abandon_unpaid_checkout(), public.approve_failed_trip_refund(), public.claim_checkout_expiry_reconciliation(), public.claim_checkout_payment(), public.enqueue_trip_refund(), public.expire_checkout_reservation_batch(), public.fail_assigned_trip(), public.queue_cancelled_order_refund() (+3 more)

### Community 27 - "supabase"
Cohesion: 0.09
Nodes (27): ReceiptItem, receiptItems(), withReceiptAddress(), supabase, checkoutAttemptIdentity(), commitCheckoutAttempt(), findCheckoutAttempt(), body (+19 more)

### Community 28 - "rider.ts"
Cohesion: 0.13
Nodes (17): customerHistoryRouter, HISTORY_SELECT, m, timestamp(), EXTRA_STOP_FEE, Cursor, cursorFilter(), encodeCursor() (+9 more)

### Community 29 - "recovery.ts"
Cohesion: 0.18
Nodes (19): paymentsConfigured, AbandonAction, abandonCheckout(), call(), mocks, cashfreeOrderId(), CfOrder, terminateCfOrder() (+11 more)

### Community 30 - "public.capacity_snapshot"
Cohesion: 0.08
Nodes (7): payouts_utr_unique, public.capacity_snapshot(), public.mark_payout_paid(), public.reset_payout_verification(), rider_payouts_utr_unique, riders_reset_payout_verification, stores_reset_payout_verification

### Community 31 - "products"
Cohesion: 0.38
Nodes (8): products_category_browse, products_search_name_trgm, products_search_words, public.browse_customer_product_ids(), public.customer_category_facets(), public.search_customer_product_ids(), products(), sub_categories

### Community 32 - "Promotional Message Delivery"
Cohesion: 0.28
Nodes (10): Channel, deliverPromotion(), DeliveryError, PromotionalMessage, providerReady(), message, Job, runPromotions() (+2 more)

### Community 34 - "vitest"
Cohesion: 0.10
Nodes (4): vitest, base, input, mocks

### Community 35 - "checkoutEligibility.ts"
Cohesion: 0.11
Nodes (22): AvailabilityIssue, checkoutAvailability(), DEFAULT_CHECKOUT_RADIUS_KM, EligibilityAddress, EligibilityProduct, istMinutes(), LineAvailability, parseStoreTime() (+14 more)

### Community 36 - "expireUnpaidOrders.ts"
Cohesion: 0.23
Nodes (8): drainExpiredReservations(), ExpiryBatch, RECONCILE_BATCH, reconcileBeforeExpiry(), ReconcileRow, runReservationExpiry(), rpc, terminate

### Community 37 - "085_push_receipts_account_deletion.sql"
Cohesion: 0.10
Nodes (20): customer_deletion_requests_queue, customer_one_deletion_request, customer_push_receipts_due, orders_customer_deletion_guard, public.claim_push_receipts(), public.customer_deletion_requests, public.customer_push_receipts, public.request_customer_deletion() (+12 more)

### Community 38 - "073_history_query_indexes.sql"
Cohesion: 0.12
Nodes (17): orders_customer_solo_history_idx, orders_payout_breakdown_idx, orders_rider_history_idx, orders_status_history_idx, orders_store_history_idx, orders_store_status_history_idx, payouts_store_history_idx, payouts_week_history_idx (+9 more)

### Community 39 - "TypeScript Configuration"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, noUncheckedIndexedAccess, outDir, rootDir (+5 more)

### Community 40 - "ESLint Configuration"
Cohesion: 0.15
Nodes (12): env, es2022, node, extends, parser, plugins, root, rules (+4 more)

### Community 42 - "riderDispatch.ts"
Cohesion: 0.27
Nodes (8): sendPushNotifications(), advanceOffers(), broadcastToRadius(), DISPATCH_OFFER_WINDOW_MS, DISPATCH_RADIUS_STEPS_M, DispatchOffer, expandDispatchOrRebroadcast(), triggerDispatch()

### Community 43 - "checkoutItems.test.ts"
Cohesion: 0.13
Nodes (4): row, EligibilityStore, line, product

### Community 44 - "Realtime Stream Subscriptions"
Cohesion: 0.17
Nodes (3): cleanup, state, streams

### Community 45 - "K6 Load Testing"
Cohesion: 0.18
Nodes (8): accounts, base, options, params(), rate, semanticErrors, setup(), vus

### Community 46 - "066_customer_support_refunds.sql"
Cohesion: 0.16
Nodes (15): customer_refund_updates_target, orders_refund_history, public.create_customer_ticket(), public.customer_refund_history, public.customer_refund_updates, public.support_messages, public.support_ticket_requests, public.support_tickets (+7 more)

### Community 47 - "checkoutQuote.ts"
Cohesion: 0.19
Nodes (14): issueQuote(), QUOTE_TTL_MS, quoteVersion(), requireConfirmedQuote(), signature(), buildCheckoutSnapshot(), confirmCheckoutQuote(), createCheckoutQuote() (+6 more)

### Community 48 - "riderSchedule.selfcheck.ts"
Cohesion: 0.14
Nodes (12): DaySchedule, isWithinSchedule(), monday0859ist, monday10ist, monday1800ist, monday20ist, mondayOff, normalized (+4 more)

### Community 49 - "notifications/router.ts"
Cohesion: 0.17
Nodes (16): notificationCursor(), CHANNELS, getPromotionalPreferences(), promotionalPreferences, savePromotionalPreferences(), mocks, validatePromotionalPreferences(), notificationsRouter (+8 more)

### Community 51 - "jobs.ts"
Cohesion: 0.19
Nodes (9): pruneAuthBudgets(), ReceiptJob, runPushReceipts(), NotificationJob, runCustomerNotifications(), fixture, pruneDeliveryCodes(), queues (+1 more)

### Community 52 - "Weekly Payout Processing"
Cohesion: 0.33
Nodes (6): computeWeeklyPayouts(), runWeeklyPayoutJob(), computeWeeklyRiderPayouts(), runWeeklyRiderPayoutJob(), previousWeekRange(), WeekRange

### Community 53 - "Payment Preference Management"
Cohesion: 0.31
Nodes (7): getPaymentPreference(), METHODS, normalizePaymentPreference(), savePaymentPreference(), selectPaymentPreference(), mocks, query()

### Community 54 - "Promo Code Validation"
Cohesion: 0.36
Nodes (5): calcDiscount(), PromoCodeRow, PromoValidationError, toPaise(), validatePromoCode()

### Community 55 - "appConfig.test.ts"
Cohesion: 0.33
Nodes (3): valid, text(), toAppConfig()

### Community 56 - "checkoutItems.ts"
Cohesion: 0.21
Nodes (11): CheckoutProduct, CheckoutVariant, PricedCheckoutItem, QuoteSnapshot, CartItem, CartProduct, CartValidationError, validateCart() (+3 more)

### Community 57 - "086_counted_pack_inventory_popularity.sql"
Cohesion: 0.13
Nodes (11): inventory_release_variant, orders_delivered_popularity, product_popularity_store_day, product_variants_active_reservations, public.approve_failed_trip_refund(), public.popular_customer_product_ids(), public.product_popularity_daily, public.protect_reserved_variant() (+3 more)

### Community 58 - "Checkout Eligibility and Inventory"
Cohesion: 0.25
Nodes (8): Checkout Eligibility and Inventory, Checkout Pricing Contract, Checkout Attempts and Payment Recovery, Customer Experience Hardening, Store Privacy, Delivery Proof and Atomic Financial Effects, Customer Payments - Cashfree, Tracking and Customer Multi-shop Cancellation, Product Pack Checkout

### Community 62 - "Order Cancellation Reasons"
Cohesion: 0.32
Nodes (4): CODES, isRiderCancelReasonCode(), RIDER_CANCEL_REASON_CODES, RiderCancelReasonCode

### Community 63 - "Delivery Failure Reasons"
Cohesion: 0.32
Nodes (4): CODES, isRiderDeliveryFailureReasonCode(), RIDER_DELIVERY_FAILURE_REASON_CODES, RiderDeliveryFailureReasonCode

### Community 64 - "Server Lifecycle Management"
Cohesion: 0.39
Nodes (5): Cleanup, closeServer(), startServer(), startupMessage(), cleanup

### Community 65 - "001_init.sql"
Cohesion: 0.17
Nodes (15): addresses, order_items, orders, payouts, products, rider_earnings, riders, stores (+7 more)

### Community 66 - "075_durable_background_workers.sql"
Cohesion: 0.15
Nodes (12): orders_delivered_settlement_idx, orders_dispatch_due_idx, payout_release_due_idx, public.advance_dispatch_offers(), public.background_worker_ready(), public.claim_payout_releases(), public.claim_scheduled_work(), public.compute_store_payouts() (+4 more)

### Community 67 - "080_atomic_order_financial_effects.sql"
Cohesion: 0.18
Nodes (11): atomic_refund_intent, atomic_rider_earning, atomic_trip_refund, order_refund_jobs_age, order_refund_jobs_due, orders_refund_history, public.claim_order_refunds(), public.order_refund_jobs (+3 more)

### Community 70 - "097_discovery_integrity.sql"
Cohesion: 0.14
Nodes (10): products_store_category_idx, products_store_deals_idx, products_store_price_idx, public.deal_customer_product_ids(), public.nearby_customer_stores(), public.popular_customer_product_ids(), public.store_category_facets(), public.store_product_page_ids() (+2 more)

### Community 74 - "091_legacy_schema_prerequisites.sql"
Cohesion: 0.17
Nodes (10): orders_order_number_unique, public.categories, public.category_sections, public.home_tab_banners, public.home_tab_tiles, public.home_tabs, public.product_variants, public.store_onboarding_drafts (+2 more)

### Community 75 - "public.settle_checkout_payment"
Cohesion: 0.17
Nodes (3): public.claim_checkout_expiry_reconciliation(), public.expire_checkout_reservation_batch(), public.settle_checkout_payment()

### Community 76 - "workers/index.ts"
Cohesion: 0.27
Nodes (8): closeDatabaseConnections(), authorizedMetrics(), startMonitoring(), rpc, shutdown(), stop(), stops, jobs

### Community 77 - "079_private_storefronts_delivery_codes.sql"
Cohesion: 0.18
Nodes (7): delivery_codes_expiry, private_delivery_code, public.complete_verified_delivery(), public.customer_delivery_codes(), public.delivery_code_resets, public.delivery_codes, public.prune_delivery_codes()

### Community 78 - "059_home_content.sql"
Cohesion: 0.28
Nodes (10): home_content_audit, home_content_revision, home_content_tab_sync, home_tab_content_sync, public.audit_home_content(), public.home_content, public.home_content_history, public.revise_home_content() (+2 more)

### Community 80 - "083_atomic_promos_receipt_snapshots.sql"
Cohesion: 0.18
Nodes (6): order_items_receipt_snapshot, orders_release_unpaid_promotion, promo_redemptions_final_guard, public.guard_promo_redemption(), public.snapshot_receipt_product(), trips_release_unpaid_promotion

### Community 81 - "Server-Owned Checkout and Merchant Approval"
Cohesion: 0.67
Nodes (3): Authentication Policy, Server-Owned Checkout and Merchant Approval, Security Patch Review

### Community 97 - "093_persistent_browse_visibility.sql"
Cohesion: 0.22
Nodes (7): products_browse_approved_store_id_idx, public.browse_collection_ids(), public.browse_customer_product_ids(), public.customer_category_facets(), public.popular_customer_product_ids(), public.repeat_purchase_candidates(), public.search_customer_product_ids()

### Community 98 - "checkout-eligibility.sql"
Cohesion: 0.21
Nodes (10): addresses, order_items, orders, product_variants, products, promo_codes, promo_redemptions, stores (+2 more)

### Community 99 - "062_order_product_variants.sql"
Cohesion: 0.20
Nodes (5): create_order(), create_trip_orders(), order_items_snapshot_variant, order_items_variant_id_idx, public.snapshot_order_item_variant()

### Community 100 - "064_checkout_attempts_payment_recovery.sql"
Cohesion: 0.21
Nodes (6): orders_pending_checkout_idx, public.checkout_attempts, public.checkout_payment_sessions, public.claim_checkout_payment(), public.close_checkout_attempt(), public.create_checkout_attempt()

### Community 101 - "067_customer_notifications.sql"
Cohesion: 0.29
Nodes (9): customer_notifications_due, customer_notifications_page, customer_order_notification, customer_push_devices_customer, public.claim_customer_notifications(), public.customer_notifications, public.customer_push_devices, public.record_customer_order_notification() (+1 more)

### Community 102 - "security/admission.ts"
Cohesion: 0.22
Nodes (7): accountBudget, Bucket, concurrentAdmission(), costlyBudget, publicBudget, requestAdmission(), TokenBudget

### Community 103 - "065_trip_cancellation.sql"
Cohesion: 0.27
Nodes (5): public.cancel_customer_trip(), public.claim_trip_refunds(), public.enqueue_trip_refund(), public.trip_refunds, trip_refunds_due

### Community 104 - "068_scoped_inventory_sync.sql"
Cohesion: 0.29
Nodes (5): inventory_signals_expiry, public.capture_inventory_signal(), public.inventory_signals, public.prune_inventory_signals(), scoped_inventory_signal

### Community 105 - "076_prompt_reservation_expiry.sql"
Cohesion: 0.27
Nodes (5): orders_trip_unpaid_expiry_idx, orders_unpaid_expiry_idx, public.background_worker_ready(), public.expire_checkout_reservation_batch(), trips_unpaid_expiry_idx

### Community 106 - "commerce-security.sql"
Cohesion: 0.22
Nodes (3): auth.sessions, auth.users, public.users

### Community 107 - "050_rider_weekly_payouts.sql"
Cohesion: 0.36
Nodes (5): rider_earnings_order_unique, rider_earnings_trip_unique, rider_earnings_unpaid, rider_payouts, rider_payouts_rider_week_unique

### Community 108 - "082_customer_startup_addresses_auth.sql"
Cohesion: 0.36
Nodes (5): addresses_one_active_default, auth_abuse_windows_expiry, public.auth_abuse_windows, public.manage_customer_address(), public.prune_auth_budgets()

### Community 109 - "088_atomic_customer_reviews.sql"
Cohesion: 0.32
Nodes (4): maintain_store_review_totals, public.maintain_store_review_totals(), public.validate_customer_review(), validate_customer_review

### Community 110 - "public.media_assets"
Cohesion: 0.36
Nodes (4): media_assets_owner_private_idx, media_assets_recovery_idx, public.claim_media_cleanup(), public.media_assets

### Community 111 - "public.promotional_deliveries"
Cohesion: 0.39
Nodes (5): promotional_delivery_expiry, promotional_delivery_leases, promotional_delivery_queue, public.claim_promotional_deliveries(), public.promotional_deliveries

### Community 112 - "variant-checkout.sql"
Cohesion: 0.39
Nodes (7): order_items, orders, product_variants, products, promo_codes, promo_redemptions, trips

### Community 113 - "077_capacity_observability.sql"
Cohesion: 0.29
Nodes (3): customer_notifications_unsent_metrics_idx, public.capacity_sample, trip_refunds_pending_metrics_idx

### Community 114 - "public.repeat_purchase_candidates"
Cohesion: 0.38
Nodes (3): order_items_repeat_candidates_idx, orders_delivered_repeat_cursor_idx, public.repeat_purchase_candidates()

### Community 115 - "wishlist.test.ts"
Cohesion: 0.33
Nodes (5): calls, handler, list(), rows, wishlistRouter

### Community 119 - "074_indexed_store_discovery.sql"
Cohesion: 0.47
Nodes (3): public.nearby_customer_stores(), stores_location_gist, stores_zone_radius_idx

### Community 122 - "migration-bootstrap.sql"
Cohesion: 0.40
Nodes (4): auth.sessions, auth.users, storage.buckets, storage.objects

### Community 135 - "history-pagination.sql"
Cohesion: 0.40
Nodes (4): public.payouts, public.reviews, public.rider_earnings, public.rider_payouts

### Community 138 - "customer-experience.sql"
Cohesion: 0.50
Nodes (3): customer_push_devices, support_tickets, wishlist_items

## Knowledge Gaps
- **367 isolated node(s):** `root`, `parser`, `plugins`, `eslint:recommended`, `plugin:@typescript-eslint/recommended` (+362 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 904 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **166 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `Stream Admission Control`, `Project Dependencies`, `publicImages.ts`, `tripRefunds.ts`, `src/index.ts`, `Network and Port Utilities`, `authenticate.ts`, `middleware/auth.ts`, `webhook.ts`, `checkoutEligibilityService.ts`, `buyItAgain.ts`, `products.ts`, `runner.ts`, `Performance Metrics and Database`, `payoutAccount.ts`, `partner.ts`, `AppError`, `lib/trips.ts`, `cashfreeClient.ts`, `upi.ts`, `collections.ts`, `Customer Cart Storage`, `checkoutQuote.test.ts`, `supabase`, `rider.ts`, `recovery.ts`, `Promotional Message Delivery`, `Order and Trip Tracking`, `checkoutEligibility.ts`, `expireUnpaidOrders.ts`, `customerAccountIsolation.test.ts`, `riderDispatch.ts`, `checkoutItems.test.ts`, `Realtime Stream Subscriptions`, `checkoutQuote.ts`, `notifications/router.ts`, `inventoryCache.test.ts`, `jobs.ts`, `Weekly Payout Processing`, `Payment Preference Management`, `Promo Code Validation`, `appConfig.test.ts`, `checkoutItems.ts`, `Admin Store Routes`, `Store Management Editing`, `Delivery Estimate Calculation`, `Order Cancellation Reasons`, `Delivery Failure Reasons`, `Server Lifecycle Management`, `Admin Delivery Settings`, `Request Recovery and Deadlines`, `Customer Deletion Admin`, `Purchase History Cache`, `Notification Navigation`, `workers/index.ts`, `Delivery OTP Verification`, `security/admission.ts`, `wishlist.test.ts`, `notifications.test.ts`?**
  _High betweenness centrality (0.137) - this node is a cross-community bridge._
- **What connects `root`, `parser`, `plugins` to the rest of the system?**
  _367 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Stream Admission Control` be split into smaller, more focused modules?**
  _Cohesion score 0.07294117647058823 - nodes in this community are weakly interconnected._
- **Why does `products()` connect `products` to `093_persistent_browse_visibility.sql`, `097_discovery_integrity.sql`, `festival_section_products`, `wishlist_items`, `083_atomic_promos_receipt_snapshots.sql`, `public.repeat_purchase_candidates`, `collections.ts`, `086_counted_pack_inventory_popularity.sql`, `103_cashfree_payments.sql`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `Project Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Why does `AppError` connect `AppError` to `publicImages.ts`, `src/index.ts`, `authenticate.ts`, `middleware/auth.ts`, `webhook.ts`, `checkoutEligibilityService.ts`, `payoutAccount.ts`, `partner.ts`, `cashfreeClient.ts`, `upi.ts`, `collections.ts`, `supabase`, `rider.ts`, `recovery.ts`, `expireUnpaidOrders.ts`, `checkoutQuote.ts`, `notifications/router.ts`, `Payment Preference Management`, `checkoutItems.ts`, `security/admission.ts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `publicImages.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0766488413547237 - nodes in this community are weakly interconnected._