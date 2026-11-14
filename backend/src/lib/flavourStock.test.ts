import { describe, expect, it } from 'vitest';
import { priceCheckoutItems, type CheckoutProduct } from './checkoutItems.js';
import { checkoutAvailability, type EligibilityProduct } from './checkoutEligibility.js';
import { toProductOptions } from '../../../apps/admin/src/lib/productValidation';
import { flavourAvailableQuantity, canAddFlavourPack } from '../../../apps/customer/src/components/FlavourPicker/flavourStock';
import type { Product } from '../../../apps/customer/src/screens/home/products/types';
import type { CartItem } from '../../../apps/customer/src/store/useCartStore';
const product: CheckoutProduct = { id:'product', store_id:'shop', is_in_stock:true, price:20,
  product_variants:[{id:'small',unit_type:'ml',quantity:170,price:20,original_price:25,is_default:true,stock_quantity:10}, {id:'large',unit_type:'ml',quantity:500,price:50,original_price:60,is_default:false,stock_quantity:10}],
  product_options:[{id:'mango',is_available:true,stock_quantity:3},{id:'rose',is_available:true,stock_quantity:0}] };
const line = {product_id:'product',variant_id:'small',option_id:'mango',quantity:2};
describe('flavour stock',()=>{
 it('saves null, zero and exact counts, rejects negative/fractional/oversized counts, and preserves omission',()=>{
  for(const stockQuantity of [null,0,5]) expect(toProductOptions({options:[{name:'Mango',stockQuantity}]})![0].stock_quantity).toBe(stockQuantity);
  expect(toProductOptions({options:[{name:'Mango'}]})![0]).not.toHaveProperty('stock_quantity');
  for(const stockQuantity of [-1,1.5,NaN,1000001]) expect(()=>toProductOptions({options:[{name:'Mango',stockQuantity}]})).toThrow('whole number');
 });
 it('aggregates the same flavour across pack sizes and rejects zero stock',()=>{
  expect(priceCheckoutItems([line],[product])[0].quantity).toBe(2);
  expect(()=>priceCheckoutItems([line,{...line,variant_id:'large',quantity:2}],[product])).toThrow('Only 3');
  expect(()=>priceCheckoutItems([{...line,option_id:'rose',quantity:1}],[product])).toThrow('out of stock');
  expect(priceCheckoutItems([{...line,option_id:null,quantity:4}],[product])[0].quantity).toBe(4);
 });
 it('reports the exact flavour status and count before placing an order',()=>{
  const p={...product,approval_status:'approved',stock_status:'in_stock',stock_tracking_enabled:true,stock_quantity:50} as EligibilityProduct;
  const result=checkoutAvailability([line,{...line,option_id:'rose',quantity:1}],[p],[{id:'shop',zone_id:'zone',is_active:true,open_time:'06:00',close_time:'22:30',lat:13.27,lng:74.75,delivery_radius_km:12}],{id:'address',zone_id:'zone',latitude:13.271,longitude:74.751},new Set(['zone']),new Date('2026-11-14T06:30:00Z'));
  expect(result.lines[0]).toMatchObject({option_id:'mango',status:'AVAILABLE',availableQuantity:3});
  expect(result.lines[1]).toMatchObject({option_id:'rose',status:'OUT_OF_STOCK',availableQuantity:0});
 });
 it('uses the tightest product/pack/flavour count without confusing another size',()=>{
  const p={id:'product',totalAvailableQuantity:20,availableQuantity:2} as Product;
  const option={id:'mango',name:'Mango',isAvailable:true,availableQuantity:5};
  expect(flavourAvailableQuantity(p,option,{id:'large',availableQuantity:10})).toBe(5);
  const cart=[{productId:'product',variantId:'small',optionId:'mango',quantity:3},{productId:'product',variantId:'large',optionId:'mango',quantity:2}] as CartItem[];
  expect(canAddFlavourPack(p,option,{id:'large',availableQuantity:10},cart)).toBe(false);
  expect(canAddFlavourPack(p,{...option,id:'rose'},{id:'large',availableQuantity:10},cart)).toBe(true);
  expect(canAddFlavourPack(p,{...option,availableQuantity:undefined},{id:'large',availableQuantity:2},cart)).toBe(false);
 });
});

it('marks zero-count flavours unavailable for older customer builds too',async()=>{
 const { applyCustomerPrices }=await import('./customerPrice');
 const row=applyCustomerPrices(product);
 expect(row.product_options![1].is_available).toBe(false);
 expect(row.product_options![0].is_available).toBe(true);
});
