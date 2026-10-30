import { describe, expect, it, vi } from 'vitest';

const sentry = vi.hoisted(() => ({ reportError: vi.fn() }));
vi.mock('./sentry.js', async (load) => ({ ...(await load<typeof import('./sentry.js')>()), reportError: sentry.reportError }));
import { scrub } from './sentry.js';
import { logger } from '../lib/logger.js';

describe('backend error reporting', () => {
  it('masks phone numbers and emails before anything leaves the server', () => {
    expect(scrub('No user for +91 98765 43210 / login+919876543210@gloceries.com'))
      .toBe('No user for [number] / [email]');
  });

  it('sends error lines that carry an error, not info lines or plain error messages', () => {
    const err = new Error('boom');
    logger.info({ err }, 'just info');
    logger.error('no error object');
    logger.error({ err }, 'Request failed');
    expect(sentry.reportError).toHaveBeenCalledTimes(1);
    expect(sentry.reportError).toHaveBeenCalledWith(err, 'Request failed');
  });
});
