import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';
import { AppError } from './errors.js';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export interface Cursor { at: string; id: string; kind?: boolean }
export interface PageOptions { limit: number; cursor: Cursor | null; scope: string; envelope: boolean }
function validValue(value: unknown, type: 'timestamp' | 'date' | 'uuid') {
  if (typeof value !== 'string') return false;
  if (type === 'uuid') return UUID.test(value);
  if (type === 'date') return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
}
export function readPage(req: Pick<Request, 'query'>, scope: string, type: 'timestamp' | 'date' | 'uuid' = 'timestamp'): PageOptions {
  const limit = req.query.limit === undefined ? 20 : Number(req.query.limit);
  if (req.query.limit !== undefined && (typeof req.query.limit !== 'string' || !/^\d+$/.test(req.query.limit)) || !Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new AppError(400, 'INVALID_PAGE', 'Choose a page size between 1 and 100.');
  const fingerprint = createHash('sha256').update(scope).digest('hex').slice(0, 32);
  let cursor: Cursor | null = null;
  if (req.query.cursor !== undefined) {
    try {
      if (typeof req.query.cursor !== 'string' || req.query.cursor.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(req.query.cursor)) throw new Error();
      const token = JSON.parse(Buffer.from(req.query.cursor, 'base64url').toString()) as Record<string, unknown>;
      if (token.v !== 1 || token.scope !== fingerprint || !validValue(token.at, type) || typeof token.id !== 'string' || !UUID.test(token.id)
        || (token.kind !== undefined && typeof token.kind !== 'boolean')) throw new Error();
      cursor = { at: token.at as string, id: token.id, kind: token.kind as boolean | undefined };
    } catch { throw new AppError(400, 'INVALID_CURSOR', 'This page cursor is invalid. Refresh the list.'); }
  }
  return { limit, cursor, scope: fingerprint, envelope: req.query.page === '1' };
}
export function encodeCursor(page: PageOptions, row: Cursor): string {
  return Buffer.from(JSON.stringify({ v: 1, scope: page.scope, ...row })).toString('base64url');
}
export function cursorFilter(column: string, cursor: Cursor) {
  if (column === 'id') return `id.lt.${cursor.id}`;
  return `${column}.lt.${cursor.at},and(${column}.eq.${cursor.at},id.lt.${cursor.id})`;
}
export function sendPage<T extends { id: string }>(res: Response, rows: T[], page: PageOptions, column: keyof T, extra: Record<string, unknown> = {}) {
  const items = rows.slice(0, page.limit);
  const last = items.at(-1);
  const nextCursor = rows.length > page.limit && last ? encodeCursor(page, { at: String(last[column]), id: last.id }) : null;
  if (nextCursor) res.set('X-Next-Cursor', nextCursor);
  res.json(page.envelope ? { items, nextCursor, ...extra } : items);
}
