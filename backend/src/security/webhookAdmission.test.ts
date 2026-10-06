import { expect, it, vi } from 'vitest';
import type { Request,Response } from 'express';
import { webhookAdmission } from './webhookAdmission.js';
it('rejects malformed signature headers before parsing and admits only POST',()=>{
 for(const signature of [undefined,[], 'a'.repeat(63),'é'.repeat(64)]){
  const next=vi.fn();webhookAdmission({method:'POST',headers:{'x-razorpay-signature':signature}} as unknown as Request,{} as Response,next);
  expect(next).toHaveBeenCalledWith(expect.objectContaining({status:401}));
 }
 const next=vi.fn();webhookAdmission({method:'POST',headers:{'x-razorpay-signature':'a'.repeat(64)}} as Request,{} as Response,next);
 expect(next).toHaveBeenCalledWith();
});
