import { beforeEach, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({ authorized:true, written:null as Record<string,unknown>|null, fail:false,
  row:{ id:'00000000-0000-4000-8000-000000000001',name:'Store',category:'Kirana & Grocery',city:'Kaup',district:'Udupi',state:'Karnataka',country:'India',created_at:'2026-01-01',lat:13,lng:74,is_active:true,turnover_exceeds_gst_threshold:false,photo_url:'https://example.com/old.webp' } }));
vi.mock('@/features/store-management/adminGate',()=>({requireStoreAdmin:async()=>fixture.authorized?null:Response.json({error:'Administrator access required.'},{status:401})}));
vi.mock('@/lib/supabase/admin',()=>({supabaseAdmin:{from:vi.fn(()=>{
 const chain={select:()=>chain,eq:()=>chain,update:(data:Record<string,unknown>)=>{fixture.written=data;return chain;},maybeSingle:async()=>fixture.fail&&fixture.written?{data:null,error:new Error('Database unavailable')}:{data:{...fixture.row,...fixture.written},error:null}};return chain;
})}}));
import { PATCH } from '../../../apps/admin/src/app/api/stores/[id]/route';
import { supabaseAdmin } from '../../../apps/admin/src/lib/supabase/admin';
const context={params:Promise.resolve({id:fixture.row.id})};
function request(body:unknown){return new Request('https://admin.test/api/stores/'+fixture.row.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});}
beforeEach(()=>{fixture.authorized=true;fixture.written=null;fixture.fail=false;vi.clearAllMocks();});
it('rejects unauthorized requests before reading or writing privileged data',async()=>{
 fixture.authorized=false;expect((await PATCH(request({name:'Changed'}),context)).status).toBe(401);expect(supabaseAdmin.from).not.toHaveBeenCalled();
});
it('persists changed profile photos and returns the saved DTO',async()=>{
 const response=await PATCH(request({name:'Updated store',photoUrl:'https://example.com/new.webp'}),context);
 expect(response.status).toBe(200);expect(fixture.written).toEqual({name:'Updated store',photo_url:'https://example.com/new.webp'});
 expect(await response.json()).toMatchObject({name:'Updated store',photoUrl:'https://example.com/new.webp'});
});
it('removes a photo without overwriting unrelated store details',async()=>{
 const response=await PATCH(request({photoUrl:null}),context);expect(response.status).toBe(200);expect(fixture.written).toEqual({photo_url:null});expect(await response.json()).toMatchObject({name:'Store'});
});
it('rejects forged provider writes and invalid merged coordinates before update',async()=>{
 expect((await PATCH(request({payout_details_status:'verified'}),context)).status).toBe(400);
 expect((await PATCH(request({lat:null}),context)).status).toBe(400);expect(fixture.written).toBeNull();
});
it('returns a retryable failure instead of claiming an unsuccessful save succeeded',async()=>{
 fixture.fail=true;const response=await PATCH(request({name:'Changed'}),context);expect(response.status).toBe(500);expect(await response.json()).toMatchObject({error:'Could not save store changes. Please retry.'});
});
