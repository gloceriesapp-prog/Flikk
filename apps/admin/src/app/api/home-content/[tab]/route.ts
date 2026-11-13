import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { TAB_KEYS, isHomeContentKey, createCustomContent, referencedIds, validateContent } from '@/lib/homeContent';
import { removeMissingReferences } from '@/features/home-content/missingReferences';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export const dynamic = 'force-dynamic';
const SELECT = 'tab_key, home_tab_id, revision, updated_at, content';
type Context = { params: Promise<{ tab: string }> };
function record(row: {
  tab_key: string;
  home_tab_id: string | null;
  revision: number;
  updated_at: string;
  content: unknown;
}) {
  return {
    tabKey: row.tab_key,
    homeTabId: row.home_tab_id,
    revision: row.revision,
    updatedAt: row.updated_at,
    content: row.content,
  };
}
async function resolveTab(context: Context) {
  const { tab } = await context.params;
  if (!isHomeContentKey(tab))
    return { error: NextResponse.json({ error: 'Unknown Home tab.' }, { status: 404 }) };
  if (TAB_KEYS.some(key => key === tab)) return { tab, homeTab: null };
  const { data, error } = await supabaseAdmin.from('home_tabs').select('id, name, is_active').eq('id', tab.slice(7)).maybeSingle();
  if (error) return { error: NextResponse.json({ error: 'Could not load this Quick category.' }, { status: 503 }) };
  if (!data) return { error: NextResponse.json({ error: 'This Quick category no longer exists.' }, { status: 404 }) };
  const { data: linked, error: linkError } = await supabaseAdmin.from('home_content').select('tab_key').eq('home_tab_id', data.id).maybeSingle();
  if (linkError) return { error: NextResponse.json({ error: 'Could not load this Quick category.' }, { status: 503 }) };
  if (linked && linked.tab_key !== tab) return { error: NextResponse.json({ error: 'This category already has a managed layout. Open it through Home Categories.' }, { status: 409 }) };
  return { tab, homeTab: data };
}
export async function GET(request: Request, context: Context) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const auth = await resolveTab(context);
  if (auth.error) return auth.error;
  if (new URL(request.url).searchParams.get('history') === '1') {
    const { data, error } = await supabaseAdmin
      .from('home_content_history')
      .select('revision, changed_at, content')
      .eq('tab_key', auth.tab)
      .order('revision', { ascending: false })
      .limit(10);
    if (error)
      return NextResponse.json({ error: 'Could not load publish history.' }, { status: 500 });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  }
  const { data, error } = await supabaseAdmin
    .from('home_content')
    .select(SELECT)
    .eq('tab_key', auth.tab)
    .maybeSingle();
  if (!error && !data && auth.homeTab) return NextResponse.json({
    tabKey: auth.tab, homeTabId: auth.homeTab.id, revision: 0, updatedAt: new Date(0).toISOString(),
    content: createCustomContent(auth.homeTab.name, auth.homeTab.is_active),
  }, { headers: { 'Cache-Control': 'no-store' } });
  if (error || !data)
    return NextResponse.json(
      { error: 'Home content is unavailable. Check migration 059.' },
      { status: 503 },
    );
  return NextResponse.json(record(data), { headers: { 'Cache-Control': 'no-store' } });
}
export async function PUT(request: Request, context: Context) {
  const { actor, denied } = await requireAdmin();
  if (denied) return denied;
  const auth = await resolveTab(context);
  if (auth.error) return auth.error;
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json(
      { error: 'Cross-origin publication is not allowed.' },
      { status: 403 },
    );
  let body: { revision?: unknown; content?: unknown };
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 262144)
      return NextResponse.json({ error: 'Content exceeds the 256 KB limit.' }, { status: 413 });
    body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
  } catch {
    return NextResponse.json({ error: 'Send a valid content document.' }, { status: 400 });
  }
  if (
    typeof body.revision !== 'number' ||
    !Number.isSafeInteger(body.revision) ||
    body.revision < (auth.homeTab ? 0 : 1)
  )
    return NextResponse.json({ error: 'A valid revision is required.' }, { status: 400 });
  let content;
  try {
    content = validateContent(body.content);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid content.' },
      { status: 400 },
    );
  }
  // Check references, including hidden sections, before the single atomic
  // update. Catalogue removal later never creates fake customer products.
  const refs = referencedIds(content);
  const missingReferences = { productIds: [] as string[], categoryIds: [] as string[], storeIds: [] as string[] };
  for (const [key, table] of [
    ['productIds', 'products'],
    ['categoryIds', 'sub_categories'],
    ['storeIds', 'stores'],
  ] as const) {
    const ids = refs[key];
    for (let offset = 0; offset < ids.length; offset += 100) {
      const batch = ids.slice(offset, offset + 100);
      const { data, error } = await supabaseAdmin.from(table).select('id').in('id', batch);
      if (error)
        return NextResponse.json(
          { error: 'Could not validate catalogue selections.' },
          { status: 503 },
        );
      if (!Array.isArray(data)) return NextResponse.json({ error: 'Could not validate catalogue selections.' }, { status: 503 });
      const found = new Set(data.map(row => row.id));
      missingReferences[key].push(...batch.filter(id => !found.has(id)));
    }
  }
  const hasMissing = Object.values(missingReferences).some(ids => ids.length);
  if (hasMissing && body.revision === 0) return NextResponse.json({
    code: 'CATALOGUE_REFERENCES_MISSING', error: 'Some selected catalogue items are unavailable. Remove them before publishing.', missingReferences,
  }, { status: 400 });
  if (hasMissing) {
    const { data: saved, error: savedError } = await supabaseAdmin.from('home_content').select(SELECT).eq('tab_key', auth.tab).maybeSingle();
    if (savedError || !saved) return NextResponse.json({ error: 'Could not verify saved selections. Please try again.' }, { status: 503 });
    let savedRefs;
    try { savedRefs = referencedIds(validateContent(saved.content)); }
    catch { return NextResponse.json({ error: 'Could not verify saved selections. Please try again.' }, { status: 503 }); }
    const legacyOnly = (Object.keys(missingReferences) as (keyof typeof missingReferences)[]).every(key => {
      const oldIds = new Set(savedRefs[key]);
      return missingReferences[key].every(id => oldIds.has(id));
    });
    if (!legacyOnly) return NextResponse.json({
    code: 'CATALOGUE_REFERENCES_MISSING',
    error: 'Some saved selections refer to items removed from the catalogue. Review the affected sections below, remove unavailable selections, then publish again.',
    missingReferences,
    }, { status: 400 });
    if (saved.revision !== body.revision) return NextResponse.json({ error: 'Someone published a newer version. Reload the live content before publishing.' }, { status: 409 });
    // Only stale references already saved in this exact revision are eligible
    // for automatic repair. New invalid selections remain a validation error.
    content = removeMissingReferences(content, missingReferences);
  }
  if (auth.homeTab && body.revision === 0) {
    // Insert, never upsert: two editors starting a new page cannot overwrite.
    const { data, error } = await supabaseAdmin.from('home_content').insert({
      tab_key: auth.tab, home_tab_id: auth.homeTab.id, content, updated_by: actor.id,
    }).select(SELECT).maybeSingle();
    if (error?.code === '23505') return NextResponse.json({ error: 'Someone published this category. Reload before publishing.' }, { status: 409 });
    if (error || !data) return NextResponse.json({ error: 'Could not publish this Quick category. Check its content migration and try again.' }, { status: 503 });
    return NextResponse.json(record(data), { headers: { 'Cache-Control': 'no-store' } });
  }
  const { data, error } = await supabaseAdmin
    .from('home_content')
    .update({ content, updated_by: actor.id })
    .eq('tab_key', auth.tab)
    .eq('revision', body.revision)
    .select(SELECT)
    .maybeSingle();
  if (error)
    return NextResponse.json(
      { error: 'Could not publish Home content. Please try again.' },
      { status: 500 },
    );
  if (!data)
    return NextResponse.json(
      { error: 'Someone published a newer version. Reload the live content before publishing.' },
      { status: 409 },
    );
  return NextResponse.json({ ...record(data), ...(hasMissing ? { repairedReferences: missingReferences } : {}) }, { headers: { 'Cache-Control': 'no-store' } });
}
