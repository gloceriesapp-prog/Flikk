// Products awaiting a founder decision, split into two groups the Approvals
// screen's Products tab renders separately:
//  - pending: brand-new partner products (approval_status='pending') — invisible
//    to customers until approved (backend's POST/PATCH /partner/products).
//  - imageChanges: live products with a partner-submitted photo waiting review
//    (products.pending_image_url not null) — still showing their old image_url.
//  - edits: live products with a partner name/price edit waiting review
//    (products.pending_changes not null, migration 115) — still showing the
//    approved name and prices. A rejected product the partner edits is back
//    in `pending` (save_catalogue_product resets it).
// Service-role read, same rationale as every other app/api/approvals/* route
// (no admin login flow yet). Reuses PRODUCT_SELECT/mapRowToProduct so the tab
// gets the same Product shape Inventory already renders.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { PRODUCT_SELECT, mapRowToProduct, type ProductRow } from '@/lib/supabase/products';

export async function GET() {
  try {
    const [pendingRes, imageRes, editsRes] = await Promise.all([
      supabaseAdmin.from('products').select(PRODUCT_SELECT).eq('approval_status', 'pending').order('name'),
      supabaseAdmin.from('products').select(PRODUCT_SELECT).not('pending_image_url', 'is', null).order('name'),
      supabaseAdmin.from('products').select(PRODUCT_SELECT).not('pending_changes', 'is', null).order('pending_changes_at'),
    ]);
    if (pendingRes.error) throw pendingRes.error;
    if (imageRes.error) throw imageRes.error;
    if (editsRes.error) throw editsRes.error;

    return NextResponse.json({
      pending: (pendingRes.data as unknown as ProductRow[]).map(mapRowToProduct),
      imageChanges: (imageRes.data as unknown as ProductRow[]).map(mapRowToProduct),
      edits: (editsRes.data as unknown as ProductRow[]).map(mapRowToProduct),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load product approvals.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
