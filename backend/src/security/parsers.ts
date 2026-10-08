import express, { type RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
import { requireActivePartner, requireAuth, requireRole, requireApproved } from '../middleware/auth.js';
import { uploadBodyDeadline } from './bodyDeadline.js';
import { uploadBudget } from './uploadBudget.js';
import { concurrentAdmission } from './admission.js';

export const UPLOAD_PATHS = ['/partner/store-photo', '/partner/store-document-photo', '/partner/product-photo', '/rider/document-photo'];
// Authenticate and admit before buffering a base64 body. Other JSON endpoints
// never get the upload allowance. Express skips bodies already parsed here.
const requireJson: RequestHandler = (req, _res, next) => {
  if (!req.is('application/json')) return next(new AppError(415, 'JSON_REQUIRED', 'Upload photos using JSON content.'));
  next();
};
export const uploadAdmission: RequestHandler[] = [requireAuth, concurrentAdmission(4), uploadBudget, requireJson, uploadBodyDeadline, express.json({ limit: '6mb', strict: true })];
export const productUploadRole: RequestHandler[] = [requireRole('store_owner'), requireApproved, requireActivePartner];
export const ordinaryJson = express.json({ limit: '128kb', strict: true });
