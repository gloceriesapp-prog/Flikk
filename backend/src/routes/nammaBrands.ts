// GET /home/namma-brands?lat=&lng= — the whole Namma Brands Home block in one
// call: header image and up to six brand cards for the customer's nearby
// shops, each with 1-2 photos and a pill computed from live in-stock prices
// (lib/nammaBrands.ts). Cards whose brand has nothing in stock nearby are
// left out; the app hides the block below MIN_CARDS. Config lives in
// home_sections ('namma-brands') and home_brand_cards (migration
// 20261127100000). Public and briefly cached, like the other Home reads.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { deliveryStores } from '../customer-experience/browse.js';
import { applyCustomerPrices } from '../lib/customerPrice.js';
import { cardImages, MAX_CARDS, pillText, type PillMode } from '../lib/nammaBrands.js';
import { sectionLive } from './homeSections.js';

export const nammaBrandsRouter = Router();

export const DEFAULT_NAMMA_HEADER = 'https://images.gloceries.com/appsui/Namma.png';

type CardRow = { brand_id: string; title: string | null; product_ids: string[] | null; pill_mode: PillMode; brands: { id: string; name: string; logo_url: string | null; popular_image_url: string | null; popular_banner_url: string | null; is_active: boolean } | null };
type ProductRow = { id: string; brand_id: string; image_url: string | null; price: number; original_price: number | null };

nammaBrandsRouter.get('/', async (req, res, next) => {
  try {
    const { data: section, error: sectionError } = await supabase.from('home_sections')
      .select('enabled, starts_at, ends_at, banner_image_url').eq('key', 'namma-brands').maybeSingle();
    if (sectionError) throw sectionError;
    if (!section || !sectionLive(section)) return res.json({ enabled: false, headerImageUrl: null, cards: [] });
    const headerImageUrl = section.banner_image_url ?? DEFAULT_NAMMA_HEADER;

    const { data: cardRows, error: cardsError } = await supabase.from('home_brand_cards')
      .select('brand_id, title, product_ids, pill_mode, brands(id, name, logo_url, popular_image_url, popular_banner_url, is_active)')
      .order('sort_index').limit(MAX_CARDS);
    if (cardsError) throw cardsError;
    const cards = ((cardRows ?? []) as unknown as CardRow[]).filter(card => card.brands?.is_active);
    const stores = await deliveryStores(req.query);
    if (!cards.length || !stores.length) return res.json({ enabled: true, headerImageUrl, cards: [] });

    // In-stock products of these brands in nearby shops, at customer prices.
    const { data: productRows, error: productsError } = await supabase.from('products')
      .select('*, product_variants(*), stores!inner(is_active)')
      .in('brand_id', cards.map(card => card.brand_id)).in('store_id', stores)
      .eq('approval_status', 'approved').eq('preorder_enabled', false).is('quick_tab_key', null)
      .eq('is_in_stock', true).neq('stock_status', 'out_of_stock').eq('stores.is_active', true);
    if (productsError) throw productsError;
    const products = applyCustomerPrices(productRows ?? []) as unknown as ProductRow[];
    const { data: popular } = await supabase.rpc('popular_customer_product_ids', { p_stores: stores, p_days: 30 });
    const ranked = ((popular ?? []) as { id: string }[]).map(row => row.id);

    const out = cards.flatMap(card => {
      const brand = card.brands!;
      const own = products.filter(p => p.brand_id === card.brand_id);
      const pill = pillText(card.pill_mode, own.map(p => ({ id: p.id, price: Number(p.price), originalPrice: p.original_price === null ? null : Number(p.original_price), inStock: true })));
      const imageUrls = cardImages(card.product_ids ?? [], own.map(p => ({ id: p.id, imageUrl: p.image_url })), ranked);
      if (!pill || !imageUrls.length) return [];
      return [{
        brand: { id: brand.id, name: brand.name, imageUrl: brand.popular_image_url ?? brand.logo_url, bannerUrl: brand.popular_banner_url ?? null },
        title: card.title?.trim() || brand.name,
        imageUrls,
        pill,
      }];
    });
    res.json({ enabled: true, headerImageUrl, cards: out });
  } catch (error) { next(error); }
});
