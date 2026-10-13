import { beforeEach,expect,it,vi } from 'vitest';
const m=vi.hoisted(()=>({from:vi.fn(),rpc:vi.fn(),reconcile:vi.fn(),recover:vi.fn(),push:vi.fn(),available:vi.fn()}));
vi.mock('../db/supabase.js',()=>({supabase:{from:m.from,rpc:m.rpc}}));
vi.mock('./razorpayClient.js',async load=>({...await load<typeof import('./razorpayClient.js')>(),paymentsConfigured:true}));
vi.mock('./recovery.js',async load=>({...await load<typeof import('./recovery.js')>(),reconcileProvider:m.reconcile,recoverProviderOrder:m.recover}));
vi.mock('./newOrderPush.js',()=>({notifyStoresOfNewOrder:m.push}));vi.mock('./availability.js',()=>({assertPaymentMethodAvailable:m.available}));
import { abandonCheckout } from './abandonCheckout.js';
const id='00000000-0000-4000-8000-000000000100';
beforeEach(()=>{vi.resetAllMocks();const q={select:vi.fn(()=>q),eq:vi.fn(()=>q),maybeSingle:vi.fn(async()=>({data:{id,total:30,provider_payment_id:null,provider_order_id:'order_one'},error:null}))};m.from.mockReturnValue(q);m.rpc.mockResolvedValue({error:null});m.reconcile.mockResolvedValue('unpaid');m.available.mockResolvedValue(undefined);});
async function run(action='cancel'){const res={json:vi.fn(),setHeader:vi.fn()};const next=vi.fn();await abandonCheckout({body:{orderId:id,action},user:{id:'customer'}} as never,res as never,next);return{res,next};}
it('reconciles then closes locally without attempting unsupported provider termination',async()=>{const{next}=await run();expect(next).not.toHaveBeenCalled();expect(m.reconcile).toHaveBeenCalledWith(expect.anything(),'order_one',30,false);expect(m.rpc).toHaveBeenCalledWith('abandon_unpaid_checkout',expect.objectContaining({p_action:'cancel',p_target_id:id}));});
it('never switches a captured online payment to COD',async()=>{m.reconcile.mockResolvedValue('paid');const{next}=await run('cod');expect(next).toHaveBeenCalledWith(expect.objectContaining({code:'PAYMENT_CAPTURED'}));expect(m.rpc).not.toHaveBeenCalled();expect(m.push).not.toHaveBeenCalled();});
it('fails closed during provider outage and checks COD availability',async()=>{m.reconcile.mockRejectedValue(new Error('provider down'));expect((await run()).next).toHaveBeenCalled();expect(m.rpc).not.toHaveBeenCalled();m.available.mockRejectedValue(new Error('COD disabled'));await run('cod');expect(m.available).toHaveBeenCalledWith('cod');});
it('announces successfully switched COD orders only',async()=>{await run('cod');expect(m.push).toHaveBeenCalledWith({orderId:id});});

it('blocks cancellation and COD while a known authorization may still capture',async()=>{
 m.reconcile.mockResolvedValue('pending');
 for(const action of ['cod','cancel'])expect((await run(action)).next).toHaveBeenCalledWith(expect.objectContaining({code:'PAYMENT_RECONCILING'}));
 expect(m.rpc).not.toHaveBeenCalled();expect(m.push).not.toHaveBeenCalled();
});
