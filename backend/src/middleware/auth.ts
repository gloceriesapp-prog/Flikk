// Role-scoped auth. Source: specs/00-foundation/auth-and-roles.md
// Role is always looked up server-side from users.role — never trusted from a
// client-supplied claim/header/body field.

import type { NextFunction, Request, Response } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import type { Role } from '../lib/orderStateMachine.js';

export interface AuthedRequest extends Request {
  user?: { id: string; role: Role; isApproved: boolean };
}

export async function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  if (!token) return next(new AppError(401, 'UNAUTHENTICATED', 'Missing session token.'));

  const { data: sessionUser, error: sessionErr } = await supabase.auth.getUser(token);
  if (sessionErr || !sessionUser?.user) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Invalid or expired session.'));
  }

  const { data: row, error: rowErr } = await supabase
    .from('users')
    .select('id, role, is_approved')
    .eq('id', sessionUser.user.id)
    .single();

  if (rowErr || !row) {
    // First authenticated request for a brand-new phone number — no
    // public.users row exists yet (OTP verify only touches Supabase's own
    // auth.users, never this table). 'customer' is the safe universal
    // default (never gated on is_approved, see this table's own comment);
    // a role-specific onboarding flow — e.g. POST /partner/store-application
    // — upgrades it once the person actually completes that flow.
    const { data: created, error: createErr } = await supabase
      .from('users')
      .insert({ id: sessionUser.user.id, phone: sessionUser.user.phone, role: 'customer' })
      .select('id, role, is_approved')
      .single();
    if (createErr || !created) return next(new AppError(401, 'UNAUTHENTICATED', 'Could not provision user record.'));
    req.user = { id: created.id, role: created.role as Role, isApproved: created.is_approved };
    return next();
  }

  req.user = { id: row.id, role: row.role as Role, isApproved: row.is_approved };
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, 'UNAUTHENTICATED', 'Missing session.'));
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'Role not permitted for this endpoint.'));
    }
    next();
  };
}

// store_owner / rider only — customer and admin are never gated on is_approved.
// See auth-and-roles.md: this must block the entire app surface, not just some actions.
export function requireApproved(req: AuthedRequest, _res: Response, next: NextFunction) {
  if (!req.user) return next(new AppError(401, 'UNAUTHENTICATED', 'Missing session.'));
  const gatedRoles: Role[] = ['store_owner', 'rider'];
  if (gatedRoles.includes(req.user.role) && !req.user.isApproved) {
    return next(new AppError(403, 'PENDING_APPROVAL', 'Account is pending admin approval.'));
  }
  next();
}
