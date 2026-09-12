// Add one real product to the festival section's shelf. sort_order is
// simply "one past whatever's already there" — this screen's own
// up/down reordering (PATCH .../products/[id]) is what actually changes
// order after that; append-at-end is the only ordering decision needed
// at add time.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { festival_section_id, product_id } = (await request.json()) as { festival_section_id: string; product_id: string };
    if (!festival_section_id || !product_id) throw new Error('festival_section_id and product_id are required.');

    const { count } = await supabaseAdmin
      .from('festival_section_products')
      .select('id', { count: 'exact', head: true })
      .eq('festival_section_id', festival_section_id);

    const { data, error } = await supabaseAdmin
      .from('festival_section_products')
      .insert({ festival_section_id, product_id, sort_order: count ?? 0 })
      .select('id, sort_order, products(id, name, price, unit, image_url)')
      .single();
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not add that product.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
