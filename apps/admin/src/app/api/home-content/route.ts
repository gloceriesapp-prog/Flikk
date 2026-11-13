import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { TAB_KEYS, customContentKey, tabKeyForName } from '@/lib/homeContent';
export const dynamic = 'force-dynamic';
export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const [tabs, content] = await Promise.all([
    supabaseAdmin.from('home_tabs').select('id, name').order('sort_order').order('name'),
    supabaseAdmin.from('home_content').select('tab_key, home_tab_id'),
  ]);
  if (tabs.error || content.error) return NextResponse.json({ error: 'Could not load Quick categories.' }, { status: 503 });
  return NextResponse.json((tabs.data ?? []).map(tab => {
    const linked = content.data?.find(row => row.home_tab_id === tab.id);
    const known = tabKeyForName(tab.name);
    const builtin = known && TAB_KEYS.includes(known as typeof TAB_KEYS[number]) && content.data?.some(row => row.tab_key === known && !row.home_tab_id) ? known : undefined;
    return { key: linked?.tab_key ?? builtin ?? customContentKey(tab.id), title: tab.name };
  }), { headers: { 'Cache-Control': 'no-store' } });
}
