import { beforeEach, expect, it, vi } from 'vitest';
const m=vi.hoisted(()=>({from:vi.fn(),order:vi.fn(),payment:vi.fn()}));
vi.mock('../db/supabase.js',()=>({supabase:{from:m.from}}));
vi.mock('./razorpayClient.js',async load=>({...await load<typeof import('./razorpayClient.js')>(),getProviderOrder:m.order,getProviderPayment:m.payment}));
import { validateCapturedPayment } from './validateCapturedPayment.js';
const id='00000000-0000-4000-8000-000000000100';
const payment={id:'pay_one',order_id:'order_one',amount:3000,currency:'INR',status:'captured',captured:true};
beforeEach(()=>{
 vi.resetAllMocks();const q={select:vi.fn(()=>q),eq:vi.fn(()=>q),single:vi.fn(async()=>({data:{total:30,payment_provider:'razorpay',provider_order_id:'order_one',provider_payment_id:'pay_one'},error:null}))};m.from.mockReturnValue(q);
 m.order.mockResolvedValue({id:'order_one',receipt:'gl_00000000000040008000000000000100',amount:3000,currency:'INR',notes:{gloceries_order_id:id}});m.payment.mockResolvedValue(payment);
});
it('returns exact captured paise after validating provider identity and local total',async()=>{expect(await validateCapturedPayment({orderId:id},'pay_one','order_one')).toBe(3000);});
it('rejects arbitrary or historic payment IDs and wrong provider order',async()=>{
 await expect(validateCapturedPayment({orderId:id},'cf_123')).rejects.toMatchObject({code:'INVALID_PAYMENT_REQUEST'});
 await expect(validateCapturedPayment({orderId:id},'pay_one','order_other')).rejects.toMatchObject({code:'PAYMENT_MISMATCH'});
});
it('rejects authorized-only, amount, currency, checkout-note and payment-order mismatch',async()=>{
 for(const wrong of [{amount:2999},{currency:'USD'},{order_id:'order_other'}]){m.payment.mockResolvedValue({...payment,...wrong});await expect(validateCapturedPayment({orderId:id},'pay_one')).rejects.toMatchObject({code:'PAYMENT_MISMATCH'});}
 m.payment.mockResolvedValue({...payment,status:'authorized',captured:false});await expect(validateCapturedPayment({orderId:id},'pay_one')).rejects.toMatchObject({code:'PAYMENT_RECONCILING'});
 m.payment.mockResolvedValue(payment);m.order.mockResolvedValue({id:'order_one',receipt:'gl_wrong',amount:3000,currency:'INR',notes:{gloceries_order_id:id}});await expect(validateCapturedPayment({orderId:id},'pay_one')).rejects.toMatchObject({code:'PAYMENT_MISMATCH'});
});

it('accepts delayed capture replay after a known payment is fully refunded without treating new refunded money as fresh',async()=>{
 m.payment.mockResolvedValue({...payment,status:'refunded'});
 expect(await validateCapturedPayment({orderId:id},'pay_one')).toBe(3000);
});
