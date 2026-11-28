// GET /home/today-grid?lat=&lng= — the "Today on Gloceries" Home grid.
// Auth optional: a signed-in customer gets Usuals/Offers, a guest gets
// Popular Near You and backups. Runs the published config version through the
// shared pure engine; the admin preview runs the same engine (see
// gridResponse, tested to match). POST /events records impressions/taps.
import { Router, type NextFunction, type Response } from 'express';
import { deliveryStores, hydrateBrowse } from '../customer-experience/browse.js';
import { AppError } from '../lib/errors.js';
import { applyCustomerPrices } from '../lib/customerPrice.js';
import { logger } from '../lib/logger.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { PRODUCT_WITH_VARIANTS_SELECT } from '../routes/stores.js';
import { buildTodayGrid, itemConfig, ITEM_IDS, type BuildInput, type ItemId } from '../../../packages/today-grid/index.js';
import { customerSummary, nearbyAvailability } from './availability.js';
import { cardProductIds } from './cardProducts.js';
import { readFestival, readPublishedGrid } from './gridState.js';

export const todayGridRouter = Router();

const optionalAuth = (req: AuthedRequest, res: Response, next: NextFunction) =>
  (req.headers.authorization ? requireAuth(req, res, next) : next());

// The customer response: the engine output minus admin-only fields.
export function gridResponse(input: BuildInput) {
  const { hero, cards, slot, refreshAt } = buildTodayGrid(input);
  return { hero, cards, slot, refreshAt };
}

todayGridRouter.get('/', optionalAuth, async (req: AuthedRequest, res, next) => {
  try {
    const now = new Date();
    res.setHeader('Cache-Control', 'private, no-store');
    const [{ enabled, config }, festival, stores] = await Promise.all([readPublishedGrid(), readFestival(), deliveryStores(req.query)]);
    if (!enabled || !stores.length) return res.json({ enabled: false, hero: null, cards: [], slot: null, generatedAt: now.toISOString() });
    const live = await nearbyAvailability(stores, now);
    const user = await customerSummary(req.user?.role === 'customer' ? req.user.id : null, live.products, live.ranked);
    res.json({ enabled: true, ...gridResponse({ now, user, availability: live.availability, config, festival }), generatedAt: now.toISOString() });
  } catch (error) { next(error); }
});

// GET /home/today-grid/cards/:id/products — the products a card tap opens.
todayGridRouter.get('/cards/:id/products', optionalAuth, async (req: AuthedRequest, res, next) => {
  try {
    const id = req.params.id as ItemId;
    if (!(ITEM_IDS as string[]).includes(id)) throw new AppError(404, 'CARD_NOT_FOUND', 'This card is no longer available.');
    res.setHeader('Cache-Control', 'private, no-store');
    const [{ config }, festival, stores] = await Promise.all([readPublishedGrid(), readFestival(), deliveryStores(req.query)]);
    if (!stores.length) return res.json({ products: [] });
    const live = await nearbyAvailability(stores, new Date());
    const user = await customerSummary(req.user?.role === 'customer' ? req.user.id : null, live.products, live.ranked);
    const ids = cardProductIds(itemConfig(id, config, festival), live, user);
    res.json({ products: applyCustomerPrices(await hydrateBrowse(ids.map(value => ({ id: value })), stores, PRODUCT_WITH_VARIANTS_SELECT)) });
  } catch (error) { next(error); }
});

const EVENT_IDS = new Set<string>(ITEM_IDS);
todayGridRouter.post('/events', optionalAuth, (req: AuthedRequest, res, next) => {
  try {
    const events = Array.isArray(req.body?.events) ? req.body.events.slice(0, 20) : null;
    if (!events) throw new AppError(400, 'INVALID_EVENTS', 'Send a list of events.');
    for (const raw of events) {
      const e = raw as Record<string, unknown>;
      if (!['impression', 'tap', 'add_to_cart'].includes(String(e.type)) || !EVENT_IDS.has(String(e.cardId))) continue;
      logger.info({ todayGrid: { type: e.type, cardId: e.cardId, slot: String(e.slot ?? '').slice(0, 20),
        position: Number.isInteger(e.position) ? e.position : null, hero: String(e.hero ?? '').slice(0, 30), signedIn: Boolean(req.user) } }, 'today_grid_event');
    }
    res.status(204).end();
  } catch (error) { next(error); }
});
