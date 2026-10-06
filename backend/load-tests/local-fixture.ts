// Local-only schema/metrics test target. This is not a backend benchmark.
import express from 'express';
import { measureHttp } from '../src/observability/http.js';
import { metrics } from '../src/observability/metrics.js';
const app=express();app.use(measureHttp);app.use(express.json());
app.get('/stores/:id/products-page',(_req,res)=>res.json({items:[{id:'fixture',name:'Fixture product'}],nextCursor:null}));
app.get('/stores/nearest',(_req,res)=>res.json([{id:'fixture-store',distance_km:1}]));
app.get('/orders/history',(_req,res)=>res.json({items:[{id:'fixture-order'}],nextCursor:null}));
app.get('/orders/:id/live',(req,res)=>res.json({id:req.params.id,status:'placed'}));
app.post('/checkout/quote',(req,res)=>res.json({token:'fixture-only',bill:{total:10},items:req.body.items}));
app.get('/metrics',(_req,res)=>res.type('text/plain').send(metrics.render()));
const server=app.listen(0,'127.0.0.1',()=>{
  const address=server.address();if(address && typeof address==='object') console.log(JSON.stringify({port:address.port,scope:'local fixture only'}));
});
process.once('SIGTERM',()=>server.close());process.once('SIGINT',()=>server.close());
