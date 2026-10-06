import { expect, it, vi } from 'vitest';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('../db/supabase.js', () => ({ supabase: { rpc } }));
import { nearbyStores, readCoordinates } from './nearbyStores.js';
it('rejects missing, blank, out-of-range coordinates and malformed zones; accepts the equator', () => {
  for (const query of [{}, {lat:'',lng:'0'}, {lat:'91',lng:'0'}, {lat:'0',lng:'181'}, {lat:'NaN',lng:'0'}, {lat:'0',lng:'0',zone_id:'x'}])
    expect(() => readCoordinates(query)).toThrow();
  expect(readCoordinates({lat:'0',lng:'0'})).toEqual({lat:0,lng:0,zoneId:undefined});
});
it('uses bounded exact-coordinate SQL discovery without a full-store fallback', async () => {
  rpc.mockResolvedValueOnce({data:[{store:{id:'one',is_active:false},distance_km:1.25}],error:null});
  expect(await nearbyStores(13.274306,74.75972,undefined,5,null)).toEqual([{id:'one',is_active:false,distance_km:1.25}]);
  expect(rpc).toHaveBeenLastCalledWith('nearby_customer_stores',{p_lat:13.274306,p_lng:74.75972,p_zone:null,p_limit:5,p_max_km:null});
  rpc.mockResolvedValueOnce({data:null,error:new Error('Missing RPC')});
  await expect(nearbyStores(0,0,undefined,1,null)).rejects.toThrow('Missing RPC');
});
