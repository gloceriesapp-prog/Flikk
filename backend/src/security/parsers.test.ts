import express from 'express';
import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
const state=vi.hoisted(()=>({retry:0,role:'customer'}));
vi.mock('../auth/authenticate.js',()=>({authenticate:vi.fn(async()=>({id:'00000000-0000-4000-8000-000000000001',role:state.role,isApproved:true}))}));
vi.mock('../db/supabase.js',()=>({supabase:{rpc:vi.fn(async()=>({data:state.retry,error:null}))}}));
vi.mock('../config/env.js',()=>({env:{supabaseServiceRoleKey:'test-only-secret'}}));
import { ordinaryJson, uploadAdmission, productUploadRole } from './parsers.js';
import { errorHandler } from '../middleware/errorHandler.js';
let server:Server | undefined;
afterEach(async()=>{state.retry=0;state.role='customer';if(server){const current=server;server=undefined;await new Promise<void>(resolve=>{current.close(()=>resolve());current.closeAllConnections();});}});
async function setup(){
 const app=express();app.post('/upload',...uploadAdmission,(_req,res)=>res.json({ok:true}));
 app.post('/product',uploadAdmission[0]!,...productUploadRole,...uploadAdmission.slice(1),(_req,res)=>res.json({ok:true}));
 app.post('/json',ordinaryJson,(_req,res)=>res.json({ok:true}));app.use(errorHandler);
 server=createServer(app);await new Promise<void>(resolve=>server!.listen(0,'127.0.0.1',resolve));
 const address=server.address();if(!address||typeof address==='string')throw new Error('No test listener');return `http://127.0.0.1:${address.port}`;
}
describe('authentication and quotas precede upload parsing',()=>{
 it('rejects anonymous upload before parsing malformed JSON',async()=>{
  const base=await setup();const response=await fetch(`${base}/upload`,{method:'POST',headers:{'Content-Type':'application/json'},body:'invalid json'});
  expect(response.status).toBe(401);
 });
 it('checks product role and shared upload quota before buffering',async()=>{
  const base=await setup();const headers={'Content-Type':'application/json',Authorization:'Bearer test-token'};
  expect((await fetch(`${base}/product`,{method:'POST',headers,body:'invalid json'})).status).toBe(403);
  state.retry=30;expect((await fetch(`${base}/upload`,{method:'POST',headers,body:'invalid json'})).status).toBe(429);
 });
 it('bounds ordinary JSON and reports parse errors correctly',async()=>{
  const base=await setup();const headers={'Content-Type':'application/json'};
  expect((await fetch(`${base}/json`,{method:'POST',headers,body:JSON.stringify({text:'x'.repeat(140000)})})).status).toBe(413);
  expect((await fetch(`${base}/json`,{method:'POST',headers,body:'invalid json'})).status).toBe(400);
 });
});
