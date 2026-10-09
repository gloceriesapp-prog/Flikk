import { expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';
vi.mock('./access.js', () => ({ requireStoreAccess: async () => ({ storeId:'shop',role:'manager' }), resolveStoreAccess: async () => ({storeId:'shop',role:'manager'}) }));
vi.mock('../db/supabase.js', () => ({ supabase: { from: (table: string) => {
  const builder = { select: () => builder, eq: () => builder, neq: () => builder, order: () => builder, limit: async () => ({data:[],error:null}), single: async () => ({ data: table === 'users' ? {phone:'+919876543210'} : {id:'shop',name:'Shop',address_line:'Street',payout_bank_account_number:'12345678',pan_number:'ABCDE1234F',gst_number:'private',fssai_number:'12345678901234',shop_establishment_number:'private'}, error:null }) }; return builder;
} } }));
import { partnerRouter } from '../routes/partner.js';
import { storeOnboardingRouter } from '../routes/storeOnboarding.js';
async function invoke(handler: RequestHandler, path: string, body: Record<string,unknown> = {}, method = 'POST') {
  const next = vi.fn(); const res = {json:vi.fn()} as unknown as Response;
  await handler({ user:{id:'manager',role:'store_owner'},path,method,body } as unknown as Request,res,next);
  return { next, res, error:next.mock.calls[0]?.[0] };
}
it('managers can toggle shop availability, but cannot change identity or the payout destination', async () => {
  const guard = partnerRouter.stack[4]!.handle as RequestHandler;
  expect((await invoke(guard,'/store',{is_active:true},'PATCH')).error).toBeUndefined();
  for (const [path,body] of [['/store',{pan_number:'ABCDE1234F'}],['/payout-account',{}],['/store-document-photo',{}]] as const) expect((await invoke(guard,path,body)).error).toMatchObject({code:'OWNER_REQUIRED',status:403});
  expect((await invoke(guard,'/products',{name:'Item'})).error).toBeUndefined();
});
it('fences private document upload before image parsing even though onboarding mounts first', async () => {
  const guard = storeOnboardingRouter.stack.find(layer => layer.route?.path === '/store-document-photo')!.route!.stack[1]!.handle as RequestHandler;
  expect((await invoke(guard,'/store-document-photo')).error).toMatchObject({code:'OWNER_REQUIRED',status:403});
});
it('omits bank and KYC fields from a manager store response', async () => {
  const route = partnerRouter.stack.find(layer => layer.route?.path === '/store' && (layer.route as unknown as {methods:Record<string,boolean>}).methods.get)!.route!;
  const {res,error} = await invoke(route.stack.at(-1)!.handle as RequestHandler,'/store',{},'GET');
  expect(error).toBeUndefined();
  const body = vi.mocked(res.json).mock.calls[0]![0] as Record<string,unknown>;
  expect(body).toMatchObject({id:'shop',access_role:'manager'});
  expect(body).not.toHaveProperty('payout_bank_account_number'); expect(body).not.toHaveProperty('pan_number'); expect(body).not.toHaveProperty('gst_number');
});
