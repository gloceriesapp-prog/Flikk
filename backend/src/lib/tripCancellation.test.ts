import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), summary: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('../payments/tripRefunds.js', () => ({ tripRefundSummary: mocks.summary }));
import { cancelCustomerTrip } from './tripCancellation.js';
const id='00000000-0000-4000-8000-000000000001';
beforeEach(() => { vi.clearAllMocks(); mocks.summary.mockResolvedValue(null); });
it('validates the target and reason before any write', async () => {
 await expect(cancelCustomerTrip('wrong','customer','reason')).rejects.toMatchObject({ status:400 });
 await expect(cancelCustomerTrip(id,'customer',' ')).rejects.toMatchObject({ status:400 });
 expect(mocks.rpc).not.toHaveBeenCalled();
});
it('sends authenticated ownership to the transaction and returns every shop outcome', async () => {
 const data={outcome:'blocked',shops:[{order_id:'a',status:'placed',outcome:'not_cancelled'},{order_id:'b',status:'out_for_delivery',outcome:'blocked'}]};
 mocks.rpc.mockResolvedValue({data,error:null});
 expect(await cancelCustomerTrip(id,'customer',' Reason ')).toEqual({...data,refund:null});
 expect(mocks.rpc).toHaveBeenCalledWith('cancel_customer_trip',{p_trip_id:id,p_customer_id:'customer',p_reason:'Reason'});
});
it('distinguishes an unavailable order from an unconfirmed database operation', async () => {
 mocks.rpc.mockResolvedValue({error:{code:'P0404'}});
 await expect(cancelCustomerTrip(id,'customer','Reason')).rejects.toMatchObject({status:404});
 mocks.rpc.mockResolvedValue({error:{code:'08006'}});
 await expect(cancelCustomerTrip(id,'customer','Reason')).rejects.toMatchObject({status:503,code:'CANCELLATION_UNAVAILABLE'});
});
