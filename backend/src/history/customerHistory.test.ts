import { beforeEach, expect, it, vi } from 'vitest';
import type { RequestHandler, Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';
const m = vi.hoisted(() => ({rpc:vi.fn(),filters:[] as [string,unknown][],rows:[] as unknown[]}));
vi.mock('../middleware/auth.js',()=>({requireAuth:vi.fn(),requireRole:()=>vi.fn()}));
vi.mock('../db/supabase.js',()=>({supabase:{rpc:m.rpc,from:()=>{
 const query={select:()=>query,eq:(key:string,value:unknown)=>{m.filters.push([key,value]);return query;},or:(filter:string)=>{m.filters.push(['or',filter]);return query;},in:()=>query,order:()=>query,then:(resolve:(v:unknown)=>unknown)=>Promise.resolve({data:m.rows,error:null}).then(resolve)};return query;
}}}));
import {customerHistoryRouter,HISTORY_SELECT} from './customerHistory.js';
const id='73000000-0000-0000-0000-000000000001';
async function request(path:string,query:Record<string,string>={}){
 const handler=customerHistoryRouter.stack.find(l=>l.route?.path===path).route.stack.at(-1).handle as RequestHandler;
 const req={query,user:{id:'owner',role:'customer'}} as unknown as AuthedRequest;
 const res={json:vi.fn(),set:vi.fn()} as unknown as Response;const next=vi.fn();await handler(req,res,next);return{res,next};
}
beforeEach(()=>{m.rpc.mockReset().mockResolvedValue({data:[],error:null});m.filters.length=0;m.rows=[];});
it('scopes both purchase selection and leg hydration to the authenticated account',async()=>{
 m.rpc.mockResolvedValue({data:[{entity_id:id,is_trip:true,placed_at:'2026-10-01T12:00:00Z'}],error:null});
 await request('/history');expect(m.rpc).toHaveBeenCalledWith('customer_purchase_page',expect.objectContaining({p_customer:'owner',p_limit:21}));
 expect(m.filters).toContainEqual(['customer_id','owner']);expect(m.filters).toContainEqual(['or',`trip_id.eq.${id}`]);
 expect(HISTORY_SELECT).not.toContain('delivery_otp');expect(HISTORY_SELECT).not.toContain('payment_id');
});
it('rejects malformed search and status filters before database access',async()=>{
 const result=await request('/history',{status:'invented'});expect(result.next).toHaveBeenCalledWith(expect.objectContaining({status:400}));expect(m.rpc).not.toHaveBeenCalled();
});
it('does not fall back to a complete order list when the history RPC is unavailable',async()=>{
 m.rpc.mockResolvedValue({data:null,error:new Error('missing RPC')});const result=await request('/history');expect(result.next).toHaveBeenCalledWith(expect.any(Error));expect(m.filters).toEqual([]);
});
it('scopes live statuses and rejects more than 100 IDs',async()=>{
 await request('/history-status',{ids:id});expect(m.filters).toContainEqual(['customer_id','owner']);
 const bad=await request('/history-status',{ids:Array(101).fill(id).join(',')});expect(bad.next).toHaveBeenCalledWith(expect.objectContaining({status:400}));
});
