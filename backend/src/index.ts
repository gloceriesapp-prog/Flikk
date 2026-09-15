import compression from 'compression';
import express from 'express';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { shortCache } from './middleware/shortCache.js';
import { authRouter } from './routes/auth.js';
import { zonesRouter } from './routes/zones.js';
import { categoriesRouter } from './routes/categories.js';
import { categorySectionsRouter } from './routes/categorySections.js';
import { homeTabsRouter } from './routes/homeTabs.js';
import { homeFestivalSectionRouter } from './routes/homeFestivalSection.js';
import { storesRouter } from './routes/stores.js';
import { ordersRouter } from './routes/orders.js';
import { tripsRouter } from './routes/trips.js';
import { addressesRouter } from './routes/addresses.js';
import { partnerRouter } from './routes/partner.js';
import { riderRouter } from './routes/rider.js';
import { adminRouter } from './routes/admin.js';
import { paymentsRouter } from './payments/router.js';
import { locationRouter } from './routes/location.js';
import { storeOnboardingRouter } from './routes/storeOnboarding.js';
import { promosRouter } from './routes/promos.js';
import { reviewsRouter } from './routes/reviews.js';
import { wishlistRouter } from './routes/wishlist.js';
import { referralsRouter } from './routes/referrals.js';
import cron from 'node-cron';
import { runWeeklyPayoutJob } from './jobs/weeklyPayouts.js';

const app = express();

// Smaller responses -> more requests/sec per instance under load. Safe
// everywhere — gzip is transparent to every client already talking JSON.
app.use(compression());

// Only web clients (apps/partner-dashboard, apps/admin) hit CORS at all —
// the three RN apps talk to this backend natively, no browser involved.
// Reflects an allowlisted origin rather than '*' so credentials/auth
// headers stay usable and no arbitrary site can call these endpoints.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && env.webDashboardOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  }
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// /payments/webhook needs the raw body for signature verification, so it's
// mounted before the generic json() parser with its own raw-capture.
app.use(
  '/payments/webhook',
  express.json({
    verify: (req, _res, buf) => {
      (req as unknown as { rawBody: string }).rawBody = buf.toString();
    },
  }),
);
// Default body limit is 100kb — fine for ordinary JSON, but every photo
// upload in this app (store-photo here, product photos, etc.) sends the
// file as base64 inside a JSON body, which inflates a real device photo
// well past that default and gets silently rejected outright (a real
// device photo failed here even after the store-images bucket fix,
// because the request body itself never made it past this limit — a tiny
// 1x1 test image during verification stayed under 100kb and masked this).
// 10mb covers a compressed photo (ImagePicker's own quality: 0.6) with
// real headroom.
app.use(express.json({ limit: '10mb' }));

// No root route existed at all — visiting the backend's own URL in a
// browser (the natural "is it actually running?" check) just 404'd with
// no way to tell a dead server from a wrong URL/port. Plain JSON, not a
// health-check library — this only needs to answer "yes, this is Flikk's
// backend, it's up," not report on DB/dependency health.
app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'flikk-backend', message: 'Flikk backend is running.' });
});

app.use('/auth', authRouter);
app.use('/zones', zonesRouter);
// Rarely-changing, read-heavy, hit on nearly every screen load — cached for
// 30s so concurrent traffic doesn't re-query Postgres for identical data a
// few seconds apart. See shortCache.ts's own note on the Redis upgrade path.
app.use('/categories', shortCache(), categoriesRouter);
app.use('/category-sections', shortCache(), categorySectionsRouter);
app.use('/home-tabs', shortCache(), homeTabsRouter);
app.use('/home/festival-section', shortCache(), homeFestivalSectionRouter);
app.use('/stores', shortCache(), storesRouter);
app.use('/orders', ordersRouter);
app.use('/trips', tripsRouter);
app.use('/addresses', addressesRouter);
app.use('/promos', promosRouter);
app.use('/reviews', reviewsRouter);
app.use('/wishlist', wishlistRouter);
app.use('/referrals', referralsRouter);
// Mounted before partnerRouter — its two routes (/store-application,
// /store-photo) must be reachable without partnerRouter's router-wide
// requireRole('store_owner')/requireApproved gate (see that file's own
// note on why). Express falls through to partnerRouter for any /partner/*
// path this router doesn't itself define.
app.use('/partner', storeOnboardingRouter);
app.use('/partner', partnerRouter);
app.use('/rider', riderRouter);
app.use('/admin', adminRouter);
app.use('/payments', paymentsRouter);
app.use('/location', locationRouter);

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Flikk backend listening on :${env.port}`);
});

// Weekly store payout release — every Monday 9 AM IST. node-cron runs
// in-process (this backend is a long-running monolith on Railway/Render,
// per CLAUDE.md — no separate scheduler infra needed at this scale). A
// crash mid-job just means Monday's run didn't complete; the next
// Monday's run picks up any still-'pending' rows from computeWeeklyPayouts'
// own unique-per-store-per-week guarantee, nothing is silently lost.
cron.schedule(
  '0 9 * * 1',
  () => {
    void runWeeklyPayoutJob().catch((err) => console.error('[weeklyPayouts] job failed', err));
  },
  { timezone: 'Asia/Kolkata' },
);
