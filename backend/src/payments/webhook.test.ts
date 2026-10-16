import { beforeEach, expect, it, vi } from 'vitest';
const m=vi.hoisted(()=>({from:vi.fn(),verify:vi.fn(),order:vi.fn(),payment:vi.fn(),refunds:vi.fn(),validate:vi.fn(),settle:vi.fn(),recover:vi.fn(),configured:{value:true}}));
vi.mock('../db/supabase.js',()=>({supabase:{from:m.from}}));
vi.mock('./razorpayClient.js',async load=>({...await load<typeof import('./razorpayClient.js')>(),get paymentsConfigured(){return m.configured.value;},verifyWebhookSignature:m.verify,getProviderOrder:m.order,getProviderPayment:m.payment,getPaymentRefunds:m.refunds}));
vi.mock('./validateCapturedPayment.js',()=>({validateCapturedPayment:m.validate}));vi.mock('./settleCheckoutPayment.js',()=>({settleCheckoutPayment:m.settle}));
vi.mock('./recovery.js',async load=>({...await load<typeof import('./recovery.js')>(),recoverProviderOrder:m.recover}));
import { handleWebhook } from './webhook.js';
const id='00000000-0000-4000-8000-000000000100';let update:ReturnType<typeof vi.fn>;
beforeEach(()=>{vi.resetAllMocks();m.configured.value=true;m.verify.mockReturnValue(true);m.order.mockResolvedValue({id:'order_one',notes:{gloceries_order_id:id}});m.recover.mockResolvedValue({id:'order_one'});m.validate.mockResolvedValue(3000);m.settle.mockResolvedValue(true);
 const q={select:vi.fn(()=>q),eq:vi.fn(()=>q),in:vi.fn(()=>q),maybeSingle:vi.fn(async()=>({data:{kind:'order',target_id:id,payment_provider:'razorpay'},error:null})),single:vi.fn(async()=>({data:{total:30},error:null})),update:vi.fn(()=>q),then:(resolve:(v:unknown)=>unknown)=>Promise.resolve({error:null}).then(resolve)};update=q.update;m.from.mockReturnValue(q);
});
async function run(body:unknown,signature:unknown='signed'){const res={status:vi.fn(()=>res),json:vi.fn()};const next=vi.fn();await handleWebhook({headers:{'x-razorpay-signature':signature},rawBody:JSON.stringify(body),body} as never,res as never,next);return{res,next};}
const capture={event:'payment.captured',payload:{payment:{entity:{id:'pay_one',order_id:'order_one'}}}};
it('rejects bad raw signatures before DB or financial state changes',async()=>{m.verify.mockReturnValue(false);const {next}=await run(capture);expect(next).toHaveBeenCalledWith(expect.objectContaining({code:'INVALID_SIGNATURE'}));expect(m.from).not.toHaveBeenCalled();expect(m.settle).not.toHaveBeenCalled();});
it('re-reads captured payment and attaches recovered order before settlement',async()=>{const {res,next}=await run(capture);expect(next).not.toHaveBeenCalled();expect(m.recover).toHaveBeenCalled();expect(m.validate).toHaveBeenCalledWith({orderId:id},'pay_one','order_one');expect(m.settle).toHaveBeenCalledWith({orderId:id},'pay_one',3000,'INR','order_one');expect(res.status).toHaveBeenCalledWith(200);});
it('does not acknowledge failed validation or orphan attachment as settled',async()=>{m.validate.mockRejectedValue(new Error('mismatch'));const{next}=await run(capture);expect(next).toHaveBeenCalled();expect(m.settle).not.toHaveBeenCalled();});
it('acknowledges irrelevant events without changing checkout state',async()=>{await run({event:'payment.authorized'});expect(m.settle).not.toHaveBeenCalled();});
it('never trusts refund webhook final state without provider read',async()=>{m.payment.mockResolvedValue({id:'pay_one'});m.refunds.mockResolvedValue([{id:'rfnd_one',payment_id:'pay_one',status:'pending'}]);await run({event:'refund.processed',payload:{refund:{entity:{id:'rfnd_one',payment_id:'pay_one'}}}});expect(update).not.toHaveBeenCalled();m.refunds.mockResolvedValue([{id:'rfnd_one',payment_id:'pay_one',status:'processed'}]);await run({event:'refund.processed',payload:{refund:{entity:{id:'rfnd_one',payment_id:'pay_one'}}}});expect(update).toHaveBeenCalledWith({next_attempt_at:expect.any(String)});expect(m.from).toHaveBeenCalledWith('order_refund_jobs');expect(m.from).toHaveBeenCalledWith('trip_refunds');expect(m.from).not.toHaveBeenCalledWith('orders');});
it.each(['processed','failed'])('wakes aggregate reconciliation for a %s partial refund without declaring the entire refund complete',async(status)=>{
 m.payment.mockResolvedValue({id:'pay_one'});
 m.refunds.mockResolvedValue([{id:'rfnd_one',payment_id:'pay_one',amount:100,status},{id:'rfnd_two',payment_id:'pay_one',amount:2900,status:'pending'}]);
 const {next}=await run({event:status==='failed'?'refund.failed':'refund.processed',payload:{refund:{entity:{id:'rfnd_one',payment_id:'pay_one'}}}});
 expect(next).not.toHaveBeenCalled();expect(update).toHaveBeenCalledTimes(2);
 for(const [patch] of update.mock.calls){expect(patch).not.toHaveProperty('refund_status');expect(patch).not.toHaveProperty('refunded_at');}
});
it('responds unavailable when keys are removed so provider retries',async()=>{m.configured.value=false;const{next}=await run(capture);expect(next).toHaveBeenCalledWith(expect.objectContaining({code:'PAYMENTS_NOT_CONFIGURED'}));});
