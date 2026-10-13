import { expect, it, vi } from 'vitest';
vi.mock('../db/supabase.js',()=>({supabase:{}}));
import { normalizeRefund,mapRefundStatus,refundProgress } from './refundPayment.js';
it('normalizes Razorpay integer paise and keeps request key distinct from provider ID',()=>{
 expect(normalizeRefund({id:'rfnd_one',payment_id:'pay_one',amount:1000,status:'processed',receipt:'gl_job'})).toEqual({id:'rfnd_one',requestKey:'gl_job',amount:1000,status:'completed'});
 expect(()=>normalizeRefund({id:'',payment_id:'pay_one',amount:1000,status:'processed'})).toThrow();
});
it('failed refunds do not reserve money but pending refunds do',()=>{
 expect(mapRefundStatus('processed')).toBe('completed');expect(mapRefundStatus('failed')).toBe('failed');expect(mapRefundStatus('pending')).toBe('processing');
 expect(refundProgress([{id:'a',amount:100,status:'failed'},{id:'b',amount:200,status:'processing'},{id:'c',amount:300,status:'completed'}],1000)).toEqual({remaining:500,completed:300,settled:false});
});
