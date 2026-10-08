import { beforeEach,expect,it,vi } from 'vitest';
const fixture=vi.hoisted(()=>({job:{id:'notification',customer_id:'customer-a',order_id:'order-a',trip_id:'trip-a',title:'On the way',body:'Open your order',attempts:1,lease_token:'lease-a'},devices:[{customer_id:'customer-a',token:'ExpoPushToken[a]'}] as Record<string,unknown>[],receipts:[] as Record<string,unknown>[],upserts:[] as Record<string,unknown>[],inCalls:[] as unknown[][],saved:{} as Record<string,unknown>,filters:[] as unknown[][]}));
vi.mock('../db/supabase.js',()=>({supabase:{rpc:vi.fn(async()=>({data:[fixture.job],error:null})),from:vi.fn((table:string)=>{
 const chain:{upsert:(data:Record<string,unknown>)=>unknown;select:()=>unknown;in:(...args:unknown[])=>Promise<unknown>;delete:()=>unknown;update:(data:Record<string,unknown>)=>unknown;eq:(...args:unknown[])=>unknown;then:(resolve:(v:unknown)=>void)=>void}={upsert:(data)=>{fixture.upserts.push(data);return chain;},select:()=>chain,in:async(...args)=>{fixture.inCalls.push([table,...args]);return {data:table==='customer_push_receipts'?fixture.receipts:fixture.devices,error:null};},delete:()=>chain,update:(data:Record<string,unknown>)=>{fixture.saved=data;return chain;},eq:(...args:unknown[])=>{fixture.filters.push([table,...args]);return chain;},then:(resolve:(v:unknown)=>void)=>resolve({error:null})};return chain;
})}}));
import { pushData, runCustomerNotifications } from './worker.js';
const twoDevices=()=>[{customer_id:'customer-a',token:'ExpoPushToken[ios]',installation_id:'install-ios',revision:1},{customer_id:'customer-a',token:'ExpoPushToken[android]',installation_id:'install-android',revision:1}];
const sentTo=(fetch:{mock:{calls:unknown[][]}})=>fetch.mock.calls.flatMap(call=>(JSON.parse((call[1] as {body:string}).body) as {to:string}[]).map(m=>m.to));
beforeEach(()=>{fixture.saved={};fixture.filters=[];fixture.upserts=[];fixture.inCalls=[];fixture.receipts=[];fixture.job.attempts=1;fixture.devices=[{customer_id:'customer-a',token:'ExpoPushToken[a]'}];vi.unstubAllGlobals();});
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
it('does not look up earlier receipts on a first attempt',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({data:[{status:'ok',id:'expo-ticket'}]})));await runCustomerNotifications();
 expect(fixture.inCalls.some(call=>call[0]==='customer_push_receipts')).toBe(false);
});
it('records the delivered device and schedules a retry when another device fails',async()=>{
 fixture.devices=twoDevices();
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({data:[{status:'ok',id:'ticket-ios'},{status:'error',details:{error:'InvalidCredentials'}}]})));await runCustomerNotifications();
 expect(fixture.upserts).toEqual([expect.objectContaining({id:'ticket-ios',notification_id:'notification',installation_id:'install-ios'})]);
 expect(fixture.saved.next_attempt_at).toBeTypeOf('string');expect(fixture.saved.push_sent_at).toBeUndefined();
});
it('on retry resends only to devices without an accepted ticket for this notification',async()=>{
 fixture.job.attempts=2;fixture.devices=twoDevices();
 fixture.receipts=[{notification_id:'notification',installation_id:'install-ios'},{notification_id:'other-notification',installation_id:'install-android'}];
 const fetch=vi.fn(async()=>Response.json({data:[{status:'ok',id:'ticket-android'}]}));vi.stubGlobal('fetch',fetch);await runCustomerNotifications();
 expect(fixture.inCalls).toContainEqual(['customer_push_receipts','notification_id',['notification']]);
 expect(sentTo(fetch)).toEqual(['ExpoPushToken[android]']);expect(fixture.saved.push_sent_at).toBeTypeOf('string');
});
it('finalizes a retry without sending when every device already accepted it',async()=>{
 fixture.job.attempts=3;fixture.devices=twoDevices();
 fixture.receipts=[{notification_id:'notification',installation_id:'install-ios'},{notification_id:'notification',installation_id:'install-android'}];
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);await runCustomerNotifications();
 expect(fetch).not.toHaveBeenCalled();expect(fixture.saved.push_sent_at).toBeTypeOf('string');
});
it('records why a push failed for the admin outbox and clears it once sent',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({data:[{status:'error',message:'rate',details:{error:'MessageRateExceeded'}}]})));await runCustomerNotifications();
 expect(fixture.saved.last_error).toBe('Push rejected: MessageRateExceeded');expect(fixture.saved.push_sent_at).toBeUndefined();
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({data:[{status:'ok',id:'expo-ticket'}]})));await runCustomerNotifications();
 expect(fixture.saved.last_error).toBeNull();expect(fixture.saved.push_sent_at).toBeTypeOf('string');
});
it('marks a customer without a device as done with a note',async()=>{
 fixture.devices=[];const fetch=vi.fn();vi.stubGlobal('fetch',fetch);await runCustomerNotifications();
 expect(fetch).not.toHaveBeenCalled();expect(fixture.saved).toMatchObject({last_error:'No registered device'});expect(fixture.saved.push_sent_at).toBeTypeOf('string');
});
it('sends an admin message without an order as an announcement',()=>{
 expect(pushData({id:'n',customer_id:'c',order_id:null,trip_id:null})).toEqual({type:'announcement',customer_id:'c',notification_id:'n'});
 expect(pushData({id:'n',customer_id:'c',order_id:'o',trip_id:null})).toEqual({type:'order',customer_id:'c',notification_id:'n',order_id:'o',is_trip:false});
});
