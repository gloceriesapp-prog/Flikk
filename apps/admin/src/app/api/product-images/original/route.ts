import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Enable only after the queue understands original-image URLs. An old database
// must not silently strip a background the admin explicitly chose to preserve.
export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { data, error } = await supabaseAdmin.rpc('product_original_images_enabled');
  return NextResponse.json({ enabled: !error && data === true });
}
