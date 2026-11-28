// GET /home/today-grid?lat=&lng= — the "Today on Gloceries" Home grid.
// Auth optional: a signed-in customer gets Usuals/Offers, a guest gets
// Popular Near You and backups. Availability is cached per nearby store set
// (availability.ts, 2 min); the personal part is computed per request.
// POST /home/today-grid/events — impressions/taps, written to the server log.
import { Router, type NextFunction, type Response } from 'express';
import { deliveryStores } from '../customer-experience/browse.js';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { customerSummary, nearbyAvailability } from './availability.js';
import { buildTodayGrid } from './buildTodayGrid.js';
import { parseConfig } from './config.js';
import { CARD_CATALOG, CARD_IDS, HERO_CATALOG } from './catalog.js';
import { cardProductIds } from './cardProducts.js';
import { cardDefinition } from './buildTodayGrid.js';
import { hydrateBrowse } from '../customer-experience/browse.js';
import { applyCustomerPrices } from '../lib/customerPrice.js';
import { PRODUCT_WITH_VARIANTS_SELECT } from '../routes/stores.js';
import type { CardId } from './types.js';

export const todayGridRouter = Router();

const optionalAuth = (req: AuthedRequest, res: Response, next: NextFunction) =>
  (req.headers.authorization ? requireAuth(req, res, next) : next());

export async function readGridConfig() {
  const { data, error } = await supabase.from('today_grid_config').select('enabled, config').eq('id', 1).maybeSingle();
  if (error) throw error;
  return { enabled: data?.enabled !== false, config: parseConfig(data?.config) };
}

todayGridRouter.get('/', optionalAuth, async (req: AuthedRequest, res, next) => {
  try {
    const now = new Date();
    res.setHeader('Cache-Control', 'private, no-store');
    const [{ enabled, config }, stores] = await Promise.all([readGridConfig(), deliveryStores(req.query)]);
    if (!enabled || !stores.length) return res.json({ enabled: false, hero: null, cards: [], slot: null, generatedAt: now.toISOString() });
    const live = await nearbyAvailability(stores, now);
    const customerId = req.user?.role === 'customer' ? req.user.id : null;
    const user = await customerSummary(customerId, live.products, live.ranked);
    const grid = buildTodayGrid({ now, user, availability: live.availability, config });
    res.json({ enabled: true, ...grid, generatedAt: now.toISOString() });
  } catch (error) { next(error); }
});

// GET /home/today-grid/cards/:id/products — the products a card tap opens.
todayGridRouter.get('/cards/:id/products', optionalAuth, async (req: AuthedRequest, res, next) => {
  try {
    const id = req.params.id as CardId;
    if (!(id in CARD_CATALOG)) throw new AppError(404, 'CARD_NOT_FOUND', 'This card is no longer available.');
    res.setHeader('Cache-Control', 'private, no-store');
    const [{ config }, stores] = await Promise.all([readGridConfig(), deliveryStores(req.query)]);
    if (!stores.length) return res.json({ products: [] });
    const live = await nearbyAvailability(stores, new Date());
    const user = await customerSummary(req.user?.role === 'customer' ? req.user.id : null, live.products, live.ranked);
    const ids = cardProductIds(cardDefinition(id, config), live, user);
    res.json({ products: applyCustomerPrices(await hydrateBrowse(ids.map(value => ({ id: value })), stores, PRODUCT_WITH_VARIANTS_SELECT)) });
  } catch (error) { next(error); }
});

const EVENT_IDS = new Set<string>([...CARD_IDS, ...Object.keys(HERO_CATALOG)]);
todayGridRouter.post('/events', optionalAuth, (req: AuthedRequest, res, next) => {
  try {
    const events = Array.isArray(req.body?.events) ? req.body.events.slice(0, 20) : null;
    if (!events) throw new AppError(400, 'INVALID_EVENTS', 'Send a list of events.');
    for (const raw of events) {
      const e = raw as Record<string, unknown>;
      if (!['impression', 'tap', 'add_to_cart'].includes(String(e.type)) || !EVENT_IDS.has(String(e.cardId))) continue;
      logger.info({ todayGrid: { type: e.type, cardId: e.cardId, slot: String(e.slot ?? '').slice(0, 20),
        position: Number.isInteger(e.position) ? e.position : null, hero: String(e.hero ?? '').slice(0, 30),
        ledToAddToCart: e.ledToAddToCart === true, signedIn: Boolean(req.user) } }, 'today_grid_event');
    }
    res.status(204).end();
  } catch (error) { next(error); }
});
