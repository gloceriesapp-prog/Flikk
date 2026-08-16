import { describe, expect, it, vi } from 'vitest';
import { requireApproved, requireRole, type AuthedRequest } from './auth.js';
import { AppError } from '../lib/errors.js';

function mockReq(user?: AuthedRequest['user']): AuthedRequest {
  return { user } as AuthedRequest;
}

function firstCallError(next: ReturnType<typeof vi.fn>): AppError {
  const call = next.mock.calls[0];
  if (!call) throw new Error('next() was never called');
  return call[0] as AppError;
}

describe('requireRole', () => {
  it('calls next with no error for an allowed role', () => {
    const next = vi.fn();
    requireRole('admin')(mockReq({ id: 'u1', role: 'admin', isApproved: true }), {} as never, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects a role not in the allowed list with 403', () => {
    const next = vi.fn();
    requireRole('admin')(mockReq({ id: 'u1', role: 'customer', isApproved: true }), {} as never, next);
    const err = firstCallError(next);
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(403);
  });

  it('rejects a missing session with 401', () => {
    const next = vi.fn();
    requireRole('admin')(mockReq(undefined), {} as never, next);
    const err = firstCallError(next);
    expect(err.status).toBe(401);
  });

  it('a customer session is rejected from every partner/rider/admin-only route', () => {
    for (const role of ['store_owner', 'rider', 'admin'] as const) {
      const next = vi.fn();
      requireRole(role)(mockReq({ id: 'u1', role: 'customer', isApproved: true }), {} as never, next);
      const err = firstCallError(next);
      expect(err.status).toBe(403);
    }
  });
});

describe('requireApproved', () => {
  it('blocks an unapproved store_owner', () => {
    const next = vi.fn();
    requireApproved(mockReq({ id: 'u1', role: 'store_owner', isApproved: false }), {} as never, next);
    const err = firstCallError(next);
    expect(err.code).toBe('PENDING_APPROVAL');
  });

  it('blocks an unapproved rider', () => {
    const next = vi.fn();
    requireApproved(mockReq({ id: 'u1', role: 'rider', isApproved: false }), {} as never, next);
    const err = firstCallError(next);
    expect(err.code).toBe('PENDING_APPROVAL');
  });

  it('never gates customer, even with isApproved false', () => {
    const next = vi.fn();
    requireApproved(mockReq({ id: 'u1', role: 'customer', isApproved: false }), {} as never, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('never gates admin', () => {
    const next = vi.fn();
    requireApproved(mockReq({ id: 'u1', role: 'admin', isApproved: false }), {} as never, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('passes an approved store_owner/rider through', () => {
    const next = vi.fn();
    requireApproved(mockReq({ id: 'u1', role: 'store_owner', isApproved: true }), {} as never, next);
    expect(next).toHaveBeenCalledWith();
  });
});
