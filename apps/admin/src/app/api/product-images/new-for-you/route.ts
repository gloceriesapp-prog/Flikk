// Sets the Home "NEW for you" tile pictures (app_content.copy keys
// home.newForYou.image1-4) to up to 4 picked cut-outs. Only these four keys
// change; the rest of App content is left as it is. Empty list = clear them
// (the app then falls back to new product photos).
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';

const KEYS = ['home.newForYou.image1', 'home.newForYou.image2', 'home.newForYou.image3', 'home.newForYou.image4'];

export async function POST(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { urls } = (await request.json().catch(() => ({}))) as { urls?: unknown };
  if (!Array.isArray(urls) || urls.length > 4 || !urls.every((u) => typeof u === 'string' && /^https:\/\/\S+$/.test(u))) {
    return NextResponse.json({ error: 'Pick up to 4 photos.' }, { status: 400 });
  }
  const { data: row, error } = await supabaseAdmin.from('app_content').select('copy').eq('id', true).maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not load App content.' }, { status: 500 });
  const copy = { ...((row?.copy as Record<string, string> | null) ?? {}) };
  KEYS.forEach((key, i) => { copy[key] = (urls[i] as string | undefined) ?? ''; });
  const { error: saveError } = await supabaseAdmin.from('app_content').update({ copy, updated_at: new Date().toISOString() }).eq('id', true);
  if (saveError) return NextResponse.json({ error: 'Could not save.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { data, error } = await supabaseAdmin.from('app_content').select('copy').eq('id', true).maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not load App content.' }, { status: 500 });
  const copy = (data?.copy as Record<string, string> | null) ?? {};
  return NextResponse.json(KEYS.map((key) => copy[key]).filter(Boolean));
}
