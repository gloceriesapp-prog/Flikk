import { promotionsRouter } from './promotions/router.js';
import { privacyRouter } from './customer-experience/privacy.js';
import { publicDeliveryRouter } from './media/publicDelivery.js';
import { productBrowseRouter } from './customer-experience/productBrowse.js';
import { startMonitoring } from './observability/runtime.js';
import { measureHttp } from './observability/http.js';
import { customerHistoryRouter } from './history/customerHistory.js';
import { collectionRouter } from './catalogue/collections.js';
import { liveOrdersRouter, liveTripsRouter } from './tracking/live.js';
import { notificationsRouter } from './notifications/router.js';
import { supportRouter } from './support/router.js';
import { staffSupportRouter } from './support/staffRouter.js';
import { customerRefundsRouter } from './support/refundsRouter.js';
import compression from 'compression';
import express from 'express';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { shortCache } from './middleware/shortCache.js';
import { authRouter } from './routes/auth.js';
import { zonesRouter } from './routes/zones.js';
import { categoriesRouter } from './routes/categories.js';
import { categorySectionsRouter } from './routes/categorySections.js';
import { homeTabsRouter } from './routes/homeTabs.js';
import { homeFestivalSectionRouter } from './routes/homeFestivalSection.js';
import { homeFestivalGreetingRouter } from './routes/homeFestivalGreeting.js';
import { homeSectionsRouter } from './routes/homeSections.js';
import { homeContentRouter } from './routes/homeContent.js';
import { homeSeasonalSectionRouter } from './routes/homeSeasonalSection.js';
import { storesRouter } from './routes/stores.js';
import { checkoutRouter } from './routes/checkout.js';
import { ordersRouter } from './routes/orders.js';
import { tripsRouter } from './routes/trips.js';
import { addressesRouter } from './routes/addresses.js';
import { partnerRouter } from './routes/partner.js';
import { riderRouter } from './routes/rider.js';
import { adminRouter } from './routes/admin.js';
import { paymentsRouter } from './payments/router.js';
import { locationRouter } from './routes/location.js';
import { storeOnboardingRouter } from './routes/storeOnboarding.js';
import { riderOnboardingRouter } from './routes/riderOnboarding.js';
import { promosRouter } from './routes/promos.js';
import { reviewsRouter } from './routes/reviews.js';
import { wishlistRouter } from './routes/wishlist.js';
import { referralsRouter } from './routes/referrals.js';
import { deliverySettingsRouter } from './routes/deliverySettings.js';
import { areaUpvotesRouter } from './routes/areaUpvotes.js';
import { appConfigRouter } from './routes/appConfig.js';
import { startServer, startupMessage } from './server/lifecycle.js';
import { startBackgroundServices } from './server/background.js';
import { closeDatabaseConnections } from './db/supabase.js';

import { webhookAdmission } from './security/webhookAdmission.js';
import { sendSmsHookRoute } from './auth/sendSmsHook.js';
import { uploadBodyDeadline } from './security/bodyDeadline.js';
import { requestAdmission, concurrentAdmission } from './security/admission.js';
import { UPLOAD_PATHS, uploadAdmission, ordinaryJson, productUploadRole } from './security/parsers.js';

const app = express();
let shuttingDown = false;
app.use(measureHttp);
app.use((_req, res, next) => {
  if (shuttingDown) {
    res.setHeader('Connection', 'close');
    res.status(503).json({ error: { code: 'SERVER_RESTARTING', message: 'The server is restarting. Please retry shortly.' } });
    return;
  }
  next();
});

// Smaller responses -> more requests/sec per instance under load. Safe
// everywhere — gzip is transparent to every client already talking JSON.
// Railway/Render put one load balancer in front of the app. Without trust
// proxy, req.ip is that balancer, so every client shares one OTP/SSE
// rate-limit bucket. Default to 1 hop on Railway; refuse to boot in
// production with 0 unless ALLOW_DIRECT_CLIENT_IP=true says nothing proxies.
const proxyHops = Number(process.env.TRUST_PROXY_HOPS ?? (process.env.RAILWAY_ENVIRONMENT ? 1 : 0));
if (!Number.isInteger(proxyHops) || proxyHops < 0 || proxyHops > 5) throw new Error('Invalid TRUST_PROXY_HOPS');
if (proxyHops) app.set('trust proxy', proxyHops);
if (!proxyHops && process.env.NODE_ENV === 'production' && process.env.ALLOW_DIRECT_CLIENT_IP !== 'true') {
  throw new Error('TRUST_PROXY_HOPS=0 in production: req.ip would be the load balancer, so all clients share one OTP/SSE rate-limit bucket. Set TRUST_PROXY_HOPS=1 on Railway/Render, or ALLOW_DIRECT_CLIENT_IP=true if no proxy sits in front.');
}
app.use(requestAdmission);
app.use(compression());

// Every request logged with method/path/status/duration — real, live
// visibility into what's actually hitting this server, not just the
// scattered console.error calls each route already had for its own
// failure paths. /health-style noise isn't filtered since there's no
// dedicated health endpoint yet (the root route below doubles as one).
app.use(pinoHttp({ logger }));

// Only web clients (apps/partner-dashboard, apps/admin) hit CORS at all —
// the three RN apps talk to this backend natively, no browser involved.
// Reflects an allowlisted origin rather than '*' so credentials/auth
// headers stay usable and no arbitrary site can call these endpoints.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.setHeader('Vary', 'Origin');
  if (origin && env.webDashboardOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
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
  webhookAdmission, concurrentAdmission(32), uploadBodyDeadline,
  express.json({
    verify: (req, _res, buf) => {
      (req as unknown as { rawBody: string }).rawBody = buf.toString();
    },
  }),
);
// Supabase Auth's Send SMS hook (login OTPs via MSG91). Signed with Standard
// Webhooks over the raw body, so it is mounted before the json() parser too.
app.post('/auth/hooks/send-sms', concurrentAdmission(32), ...sendSmsHookRoute);
for (const path of UPLOAD_PATHS) {
  const [auth, ...rest] = uploadAdmission;
  app.post(path, auth!, ...(path === '/partner/product-photo' ? productUploadRole : []), ...rest);
}
app.use(ordinaryJson);

// No root route existed at all — visiting the backend's own URL in a
// browser (the natural "is it actually running?" check) just 404'd with
// no way to tell a dead server from a wrong URL/port. Plain JSON, not a
// health-check library — this only needs to answer "yes, this is Gloceries's
// backend, it's up," not report on DB/dependency health.
app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'gloceries-backend', message: 'Gloceries backend is running.' });
});

app.use('/privacy', privacyRouter);
app.use('/auth', authRouter);
app.use('/zones', zonesRouter);
// Rarely-changing, read-heavy, hit on nearly every screen load — cached for
// 30s so concurrent traffic doesn't re-query Postgres for identical data a
// few seconds apart. See shortCache.ts's own note on the Redis upgrade path.
app.use('/browse', shortCache(30000), productBrowseRouter);
app.use('/categories', shortCache(), categoriesRouter);
app.use('/category-sections', shortCache(), categorySectionsRouter);
app.use('/home-tabs', shortCache(), homeTabsRouter);
app.use('/home/festival-section', shortCache(), homeFestivalSectionRouter);
app.use('/home/festival-greeting', shortCache(), homeFestivalGreetingRouter);
app.use('/home/sections', shortCache(), homeSectionsRouter);
app.use('/home/content', homeContentRouter);
app.use('/home/seasonal-section', shortCache(), homeSeasonalSectionRouter);
app.use('/stores', shortCache(), collectionRouter, storesRouter);
app.use('/media/public', publicDeliveryRouter);
app.use('/checkout', checkoutRouter);
app.use('/support', supportRouter);
app.use('/staff-support', staffSupportRouter);
app.use('/customer-refunds', customerRefundsRouter);
app.use('/notifications', notificationsRouter);
app.use('/admin/promotions', promotionsRouter);
app.use('/orders', customerHistoryRouter);
app.use('/orders', liveOrdersRouter);
app.use('/orders', ordersRouter);
app.use('/trips', liveTripsRouter);
app.use('/trips', tripsRouter);
app.use('/addresses', addressesRouter);
app.use('/promos', promosRouter);
app.use('/reviews', reviewsRouter);
app.use('/wishlist', wishlistRouter);
app.use('/referrals', referralsRouter);
app.use('/delivery-settings', shortCache(5000), deliverySettingsRouter);
app.use('/app-config', shortCache(60000), appConfigRouter);
app.use('/area-upvotes', areaUpvotesRouter);
// Mounted before partnerRouter — its two routes (/store-application,
// /store-photo) must be reachable without partnerRouter's router-wide
// requireRole('store_owner')/requireApproved gate (see that file's own
// note on why). Express falls through to partnerRouter for any /partner/*
// path this router doesn't itself define.
app.use('/partner', storeOnboardingRouter);
app.use('/partner', partnerRouter);
// Mounted before riderRouter for the same reason storeOnboardingRouter is
// mounted before partnerRouter above: riderRouter applies a router-wide
// requireRole('rider')/requireApproved gate, which a brand-new applicant
// (still role='customer') can never satisfy. The onboarding routes
// (/application, /draft, /document-photo) each guard with requireAuth only
// and must be reachable first; Express falls through to the gated
// riderRouter for any /rider/* path this router doesn't itself define.
app.use('/rider', riderOnboardingRouter);
app.use('/rider', riderRouter);
app.use('/admin', adminRouter);
app.use('/payments', paymentsRouter);
app.use('/location', locationRouter);

app.use(errorHandler);

try {
  const runtime = await startServer(app, env.port, startBackgroundServices);
  let stopMonitoring: () => Promise<void>;
  try { stopMonitoring = await startMonitoring('api',() => !shuttingDown); }
  catch (error) { await runtime.stop(); throw error; }
  logger.info({ port: env.port, pid: process.pid }, 'Gloceries backend listening');
  let stopping = false;
  const shutdown = (signal: string) => {
    if (stopping) return;
    stopping = true;
    shuttingDown = true;
    logger.info({ signal }, 'Backend shutting down');
    const deadline = setTimeout(() => {
      logger.error('Shutdown exceeded 15 seconds; durable jobs will recover on restart');
      runtime.server.closeAllConnections();
      process.exit(1);
    }, 15000);
    void Promise.all([runtime.stop(),stopMonitoring()]).then(closeDatabaseConnections).catch(err => {
      logger.error({ err }, 'Backend shutdown failed');
      process.exitCode = 1;
    }).finally(() => clearTimeout(deadline));
  };
  runtime.server.on('error', error => {
    logger.error({ err: error }, 'HTTP server error');
    process.exitCode = 1;
    shutdown('server-error');
  });
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
} catch (error) {
  logger.error(startupMessage(error, env.port));
  await closeDatabaseConnections();
  process.exitCode = 1;
}
