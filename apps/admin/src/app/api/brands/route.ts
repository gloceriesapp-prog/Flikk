// Brands for the product form's brand picker: list them all, or create one
// (name + optional logo). Service role + admin check, like every admin write.
// A name that already exists (any letter case) returns that brand instead of
// failing, so "Add new brand" never makes a duplicate.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import type { Brand } from '@/lib/types';

const BRAND_SELECT = 'id, name, logo_url, is_active';
type BrandRow = { id: string; name: string; logo_url: string | null; is_active: boolean };
const toBrand = (row: BrandRow): Brand => ({ id: row.id, name: row.name, logoUrl: row.logo_url ?? undefined, isActive: row.is_active });

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { data, error } = await supabaseAdmin.from('brands').select(BRAND_SELECT).order('name');
  if (error) {
    console.error('Admin brands read failed', error);
    return NextResponse.json({ error: 'Could not load brands.' }, { status: 500 });
  }
  return NextResponse.json((data as BrandRow[]).map(toBrand));
}

export async function POST(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const body = await request.json().catch(() => null) as { name?: unknown; logoUrl?: unknown } | null;
  const name = typeof body?.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
  if (name.length < 1 || name.length > 80) return NextResponse.json({ error: 'Enter a brand name (up to 80 characters).' }, { status: 400 });
  const logoUrl = typeof body?.logoUrl === 'string' && /^https:\/\//.test(body.logoUrl) ? body.logoUrl : null;

  const { data, error } = await supabaseAdmin.from('brands').insert({ name, logo_url: logoUrl }).select(BRAND_SELECT).single();
  if (!error) return NextResponse.json(toBrand(data as BrandRow));
  if (error.code === '23505') {
    // Already exists: hand back the existing brand (filling in a logo if it had none).
    const { data: rows } = await supabaseAdmin.from('brands').select(BRAND_SELECT).ilike('name', name.replace(/[\\%_]/g, '\\$&')).limit(1);
    const existing = (rows as BrandRow[] | null)?.[0];
    if (existing) {
      if (logoUrl && !existing.logo_url) {
        await supabaseAdmin.from('brands').update({ logo_url: logoUrl }).eq('id', existing.id);
        existing.logo_url = logoUrl;
      }
      return NextResponse.json(toBrand(existing));
    }
  }
  console.error('Admin brand create failed', error);
  return NextResponse.json({ error: 'Could not add the brand. Try again.' }, { status: 500 });
}
