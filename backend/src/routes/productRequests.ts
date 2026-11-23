// Public. Source: customer Store list "Didn't find an item?" sheet
// (RequestProductSheet.tsx). No login needed, like area-upvotes: a guest
// browsing the store list can ask for a product too.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';

export const productRequestsRouter = Router();

const optionalText = (value: unknown, max: number) =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;

productRequestsRouter.post('/', async (req, res, next) => {
  try {
    const { message, city, storeName } = req.body ?? {};
    if (typeof message !== 'string' || message.trim().length < 3 || message.trim().length > 500)
      throw new AppError(400, 'INVALID_MESSAGE', 'Tell us the product in 3–500 characters.');
    const { error } = await supabase.from('product_requests')
      .insert({ message: message.trim(), city: optionalText(city, 120), store_name: optionalText(storeName, 200) });
    if (error) throw error;
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});
