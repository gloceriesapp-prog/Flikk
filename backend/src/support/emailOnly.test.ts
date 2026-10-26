import { expect, it, vi } from 'vitest';
import express from 'express';
import { supportRouter } from './router.js';
// Exercise the retirement middleware directly; auth/role middleware remain
// before it on the router. No database module is imported by the router.
it('all legacy customer support paths return a migration error without storing messages', () => {
  const retirement = supportRouter.stack.at(-1)!.handle;
  for (const path of ['/tickets', '/tickets/id/messages', '/request-id', '/orders']) {
    const next = vi.fn();
    retirement({ method: 'POST', path } as express.Request, {} as express.Response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 410, code: 'SUPPORT_MOVED_TO_EMAIL' }));
  }
});
