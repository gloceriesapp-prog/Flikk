import type { NextFunction, Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';

const KEY = 'customer_promotional_preferences';
const CHANNELS = ['sms', 'push', 'email'] as const;
export type PromotionalPreferences = Record<typeof CHANNELS[number], boolean>;
export function promotionalPreferences(value: unknown): PromotionalPreferences {
  const stored = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return Object.fromEntries(CHANNELS.map(channel => [channel, typeof stored[channel] === 'boolean' ? stored[channel] : true])) as PromotionalPreferences;
}
export function validatePromotionalPreferences(value: unknown): PromotionalPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== CHANNELS.length || CHANNELS.some(channel => typeof (value as Record<string, unknown>)[channel] !== 'boolean')) {
    throw new AppError(400, 'INVALID_PREFERENCES', 'Choose your promotional preferences.');
  }
  return promotionalPreferences(value);
}
export async function getPromotionalPreferences(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { data, error } = await supabase.auth.admin.getUserById(req.user!.id);
    if (error || !data.user) throw new AppError(503, 'PREFERENCES_UNAVAILABLE', 'Could not load your preferences.');
    res.json(promotionalPreferences(data.user.user_metadata?.[KEY]));
  } catch (error) { next(error); }
}
export async function savePromotionalPreferences(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const preferences = validatePromotionalPreferences(req.body);
    const { error } = await supabase.auth.admin.updateUserById(req.user!.id, { user_metadata: { [KEY]: preferences } });
    if (error) throw new AppError(503, 'PREFERENCES_UNAVAILABLE', 'Could not save your preferences.');
    res.json(preferences);
  } catch (error) { next(error); }
}
