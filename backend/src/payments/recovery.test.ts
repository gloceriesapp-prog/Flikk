import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(()=>({rpc:vi.fn(),from:vi.fn(),create:vi.fn(),get:vi.fn(),find:vi.fn(),payments:vi.fn(),settle:vi.fn()}));
vi.mock('../db/supabase.js',()=>({supabase:{rpc:m.rpc,from:m.from}}));
vi.mock('./razorpayClient.js',async load=>({...await load<typeof import('./razorpayClient.js')>(),createProviderOrder:m.create,getProviderOrder:m.get,findProviderOrder:m.find,getOrderPayments:m.payments}));
vi.mock('./settleCheckoutPayment.js',()=>({settleCheckoutPayment:m.settle}));
import { paymentTarget, ensureProviderOrder, reconcileProvider, requirePaymentRetrySafe, claimPayment } from './recovery.js';
const id='00000000-0000-4000-8000-000000000100'; const target=paymentTarget({orderId:id});
const provider={id:'order_one',amount:3000,currency:'INR',receipt:'gl_00000000000040008000000000000100',notes:{gloceries_order_id:id}};
let session: {provider_order_id:string|null;payment_provider:string}; let claimed=false;
beforeEach(()=>{
 vi.resetAllMocks(); session={provider_order_id:'order_one',payment_provider:'razorpay'};claimed=false;
 m.rpc.mockImplementation(async(name:string)=>({data:name==='claim_checkout_payment'?{claimed,total:30,session}:session,error:null}));
 const q={select:vi.fn(()=>q),eq:vi.fn(()=>q),limit:vi.fn(()=>q),maybeSingle:vi.fn(async()=>({data:{...session,reservation_expires_at:new Date(Date.now()+600000).toISOString()},error:null}))};m.from.mockReturnValue(q);
 m.get.mockResolvedValue(provider);m.find.mockResolvedValue(provider);m.create.mockResolvedValue(provider);m.payments.mockResolvedValue([]);m.settle.mockResolvedValue(true);
});
it('reuses the attached provider order and atomically validates attachment',async()=>{
 expect(await ensureProviderOrder(target,'customer')).toEqual(provider);expect(m.create).not.toHaveBeenCalled();
 expect(m.rpc).toHaveBeenCalledWith('attach_checkout_provider_order',expect.objectContaining({p_provider_order_id:'order_one',p_expected_paise:3000,p_provider:'razorpay'}));
});
it('recovers a lost response by receipt without another provider POST',async()=>{
 session.provider_order_id=null;expect(await ensureProviderOrder(target,'customer')).toEqual(provider);
 expect(m.find).toHaveBeenCalledWith(provider.receipt);expect(m.create).not.toHaveBeenCalled();
});
it('never repeats an ambiguous create even when receipt lookup is empty',async()=>{
 session.provider_order_id=null;m.find.mockResolvedValue(null);
 await expect(ensureProviderOrder(target,'customer')).rejects.toMatchObject({code:'PAYMENT_RECONCILING'});expect(m.create).not.toHaveBeenCalled();
});
it('creates only on first durable claim using exact total and notes',async()=>{
 session.provider_order_id=null;claimed=true;m.find.mockResolvedValue(null);await ensureProviderOrder(target,'customer');
 expect(m.create).toHaveBeenCalledTimes(1);expect(m.create).toHaveBeenCalledWith({receipt:provider.receipt,amountPaise:3000,notes:{gloceries_order_id:id}});
});
it('keeps the durable claim after provider timeout',async()=>{
 session.provider_order_id=null;claimed=true;m.find.mockResolvedValue(null);m.create.mockRejectedValue(new Error('timeout'));
 await expect(ensureProviderOrder(target,'customer')).rejects.toThrow('timeout');expect(m.rpc.mock.calls.filter(([name])=>name==='attach_checkout_provider_order')).toHaveLength(0);
});
it('fences historical providers and wrong amounts',async()=>{
 session.payment_provider='cashfree';await expect(ensureProviderOrder(target,'customer')).rejects.toMatchObject({code:'PAYMENT_REVIEW_REQUIRED'});expect(m.get).not.toHaveBeenCalled();
 session.payment_provider='razorpay';m.get.mockResolvedValue({...provider,amount:2999});await expect(ensureProviderOrder(target,'customer')).rejects.toMatchObject({code:'PAYMENT_REVIEW_REQUIRED'});
});
it('settles captured payments only and blocks retry for authorized attempts',async()=>{
 m.payments.mockResolvedValue([{id:'pay_one',order_id:'order_one',currency:'INR',amount:3000,status:'authorized',captured:false}]);
 await expect(requirePaymentRetrySafe(target,'order_one',30)).rejects.toMatchObject({code:'PAYMENT_RECONCILING'});expect(m.settle).not.toHaveBeenCalled();
 m.payments.mockResolvedValue([{id:'pay_one',order_id:'order_one',currency:'INR',amount:3000,status:'captured',captured:true}]);
 expect(await reconcileProvider(target,'order_one',30)).toBe('paid');expect(m.settle).toHaveBeenCalledWith({orderId:id},'pay_one',3000,'INR','order_one');
});
it('rejects mismatched payment without settling and reports rejected late capture',async()=>{
 m.payments.mockResolvedValue([{id:'pay_one',order_id:'order_other',currency:'INR',amount:3000,status:'captured',captured:true}]);
 await expect(reconcileProvider(target,'order_one',30)).rejects.toMatchObject({code:'PAYMENT_REVIEW_REQUIRED'});expect(m.settle).not.toHaveBeenCalled();
 m.payments.mockResolvedValue([{id:'pay_one',order_id:'order_one',currency:'INR',amount:3000,status:'captured',captured:true}]);m.settle.mockResolvedValue(false);
 expect(await reconcileProvider(target,'order_one',30)).toBe('cancelled');
});
it('maps transaction ownership/closed-state errors and scopes claim provider',async()=>{
 m.rpc.mockResolvedValue({error:{code:'P0403'}});await expect(claimPayment(target,'other','order')).rejects.toMatchObject({code:'FORBIDDEN'});
 m.rpc.mockResolvedValue({error:{code:'P0410'}});await expect(claimPayment(target,'customer','order')).rejects.toMatchObject({code:'PAYMENT_NOT_PAYABLE'});
});

it('does not suppress authorized payment state during explicit abandonment',async()=>{
 m.payments.mockResolvedValue([{id:'pay_one',order_id:'order_one',currency:'INR',amount:3000,status:'authorized',captured:false}]);
 expect(await reconcileProvider(target,'order_one',30,false)).toBe('pending');
 m.payments.mockResolvedValue([{id:'pay_one',order_id:'order_one',currency:'INR',amount:3000,status:'created',captured:false}]);
 expect(await reconcileProvider(target,'order_one',30,false)).toBe('unpaid');
});
