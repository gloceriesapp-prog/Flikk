import { beforeEach,expect,it,vi } from 'vitest';
const fixture=vi.hoisted(()=>({job:{id:'notification',customer_id:'customer-a',order_id:'order-a',trip_id:'trip-a',title:'On the way',body:'Open your order',attempts:1,lease_token:'lease-a'},devices:[{customer_id:'customer-a',token:'ExpoPushToken[a]'}],saved:{} as Record<string,unknown>,filters:[] as unknown[][]}));
vi.mock('../db/supabase.js',()=>({supabase:{rpc:vi.fn(async()=>({data:[fixture.job],error:null})),from:vi.fn((table:string)=>{
 const chain:{upsert:()=>unknown;select:()=>unknown;in:()=>Promise<unknown>;delete:()=>unknown;update:(data:Record<string,unknown>)=>unknown;eq:(...args:unknown[])=>unknown;then:(resolve:(v:unknown)=>void)=>void}={upsert:()=>chain,select:()=>chain,in:async()=>({data:fixture.devices,error:null}),delete:()=>chain,update:(data:Record<string,unknown>)=>{fixture.saved=data;return chain;},eq:(...args:unknown[])=>{fixture.filters.push([table,...args]);return chain;},then:(resolve:(v:unknown)=>void)=>resolve({error:null})};return chain;
})}}));
import { runCustomerNotifications } from './worker.js';
beforeEach(()=>{fixture.saved={};fixture.filters=[];fixture.devices=[{customer_id:'customer-a',token:'ExpoPushToken[a]'}];vi.unstubAllGlobals();});
it('sends an account-owned trip payload and finalizes only the claimed lease',async()=>{
 const fetch=vi.fn(async()=>Response.json({data:[{status:'ok',id:'expo-ticket'}]}));vi.stubGlobal('fetch',fetch);await runCustomerNotifications();
 const payload=JSON.parse(fetch.mock.calls[0]![1]!.body as string)[0];
 expect(payload.data).toEqual({type:'order',customer_id:'customer-a',notification_id:'notification',order_id:'trip-a',is_trip:true});
 expect(fixture.saved.push_sent_at).toBeTypeOf('string');expect(fixture.filters).toContainEqual(['customer_notifications','lease_token','lease-a']);
});
it('retries provider failures and malformed tickets without losing the inbox',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({data:[]})));await runCustomerNotifications();
 expect(fixture.saved.next_attempt_at).toBeTypeOf('string');expect(fixture.saved.push_sent_at).toBeUndefined();expect(fixture.saved.lease_token).toBeNull();
});
it('removes rejected device tokens only for their owner',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({data:[{status:'error',details:{error:'DeviceNotRegistered'}}]})));await runCustomerNotifications();
 expect(fixture.filters).toContainEqual(['customer_push_devices','customer_id','customer-a']);expect(fixture.filters).toContainEqual(['customer_push_devices','token','ExpoPushToken[a]']);expect(fixture.saved.push_sent_at).toBeTypeOf('string');
});
it('never sends to another customer or a detached device',async()=>{
 fixture.devices=[{customer_id:'customer-b',token:'ExpoPushToken[b]'},{customer_id:'customer-a',token:'disabled:installation'}];const fetch=vi.fn();vi.stubGlobal('fetch',fetch);await runCustomerNotifications();expect(fetch).not.toHaveBeenCalled();expect(fixture.saved.push_sent_at).toBeTypeOf('string');
});
