// Home "NEW for you" tile pictures (lib/productImageJobs NEW_FOR_YOU_KEYS).
// POST { urls } saves up to 4 picked cut-outs (manual); POST { auto: true }
// switches to 4 random cut-outs, refreshed as new photos are cleaned; an
// empty manual list clears them (the app then shows new product photos).
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { NEW_FOR_YOU_AUTO_KEY, NEW_FOR_YOU_KEYS, randomCutouts, saveNewForYou } from '@/lib/productImageJobs';

export async function POST(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { urls, auto } = (await request.json().catch(() => ({}))) as { urls?: unknown; auto?: unknown };
  try {
    if (auto === true) {
      const picked = await randomCutouts();
      await saveNewForYou(picked, true);
      return NextResponse.json({ urls: picked, auto: true });
    }
    if (!Array.isArray(urls) || urls.length > 4 || !urls.every((u) => typeof u === 'string' && /^https:\/\/\S+$/.test(u))) {
      return NextResponse.json({ error: 'Pick up to 4 photos.' }, { status: 400 });
    }
    await saveNewForYou(urls as string[], false);
    return NextResponse.json({ urls, auto: false });
  } catch {
    return NextResponse.json({ error: 'Could not save.' }, { status: 500 });
  }
}

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { data, error } = await supabaseAdmin.from('app_content').select('copy').eq('id', true).maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not load App content.' }, { status: 500 });
  const copy = (data?.copy as Record<string, string> | null) ?? {};
  return NextResponse.json({ urls: NEW_FOR_YOU_KEYS.map((key) => copy[key]).filter(Boolean), auto: copy[NEW_FOR_YOU_AUTO_KEY] === 'true' });
}
