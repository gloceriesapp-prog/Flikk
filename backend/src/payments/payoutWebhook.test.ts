import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { afterEach, expect, it, vi } from 'vitest';
const rpc=vi.hoisted(()=>vi.fn());
vi.mock('../db/supabase.js',()=>({supabase:{rpc}}));
vi.mock('./validateCapturedPayment.js',()=>({validateCapturedPayment:vi.fn()}));
vi.mock('./settleCheckoutPayment.js',()=>({settleCheckoutPayment:vi.fn()}));
import { handleWebhook } from './webhook.js';
afterEach(()=>vi.clearAllMocks());
it('settles a signed payout in one database transaction',async()=>{
  rpc.mockResolvedValue({error:null});
  const body={event:'payout.processed',payload:{payout:{entity:{id:'pout1',reference_id:'75000000-0000-0000-0000-000000000001'}}}};
  const rawBody=JSON.stringify(body);
  const signature=crypto.createHmac('sha256','test-webhook-secret').update(rawBody).digest('hex');
  const req={body,rawBody,headers:{'x-razorpay-signature':signature}} as unknown as Request;
  const res={status:vi.fn().mockReturnThis(),json:vi.fn()} as unknown as Response;
  const next=vi.fn();await handleWebhook(req,res,next);
  expect(next).not.toHaveBeenCalled();
  expect(rpc).toHaveBeenCalledOnce();
  expect(rpc).toHaveBeenCalledWith('settle_payout_webhook',{p_reference:body.payload.payout.entity.reference_id,p_provider:'pout1',p_event:'payout.processed'});
  expect(res.status).toHaveBeenCalledWith(200);
});
it('rejects unsigned events before touching financial state',async()=>{
  const next=vi.fn();await handleWebhook({headers:{},body:{event:'payout.processed'}} as Request,{} as Response,next);
  expect(rpc).not.toHaveBeenCalled();expect(next).toHaveBeenCalled();
});
