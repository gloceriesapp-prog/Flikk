import { HomeContentEditor } from '@/features/home-content/HomeContentEditor';
import { isHomeContentKey, customContentKey, tabKeyForName } from '@/lib/homeContent';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { supabaseAdmin } from '@/lib/supabase/admin';
export default async function HomeContentPage({ searchParams }: { searchParams: Promise<{ tab?: string; homeTab?: string }> }) {
  const params = await searchParams;
  let key = isHomeContentKey(params.tab) ? params.tab : 'grocery' as const;
  const { denied } = await requireAdmin();
  if (!denied && params.homeTab && isHomeContentKey(`custom-${params.homeTab}`)) {
    const { data: linked } = await supabaseAdmin.from('home_content').select('tab_key').eq('home_tab_id', params.homeTab).maybeSingle();
    key = linked && isHomeContentKey(linked.tab_key) ? linked.tab_key : customContentKey(params.homeTab);
    if (!linked) {
      const { data: tab } = await supabaseAdmin.from('home_tabs').select('name').eq('id', params.homeTab).maybeSingle();
      const builtin = tab && tabKeyForName(tab.name);
      if (builtin) {
        const { data: unlinked } = await supabaseAdmin.from('home_content').select('home_tab_id').eq('tab_key', builtin).maybeSingle();
        if (unlinked && !unlinked.home_tab_id) key = builtin;
      }
    }
  }
  return <HomeContentEditor initialTab={key} />;
}
