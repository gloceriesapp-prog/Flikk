// What the live grid runs on: the published config version (today_grid_state
// -> today_grid_versions) and the active festival from festival_greeting (the
// single festival source; the grid never stores its own festival list).
// Read on every request, so Publish takes effect immediately — there is no
// config cache to invalidate.
import { supabase } from '../db/supabase.js';
import { DEFAULT_CONFIG, readConfig, type FestivalInput, type TodayGridConfig } from '../../../packages/today-grid/index.js';

export async function readPublishedGrid(): Promise<{ enabled: boolean; config: TodayGridConfig; versionId: number | null }> {
  const { data, error } = await supabase.from('today_grid_state').select('enabled, published_version_id, today_grid_versions(config)').eq('id', 1).maybeSingle();
  if (error) throw error;
  const row = data as { enabled?: boolean; published_version_id?: number | null; today_grid_versions?: { config: unknown } | null } | null;
  return {
    enabled: row?.enabled !== false,
    config: row?.today_grid_versions ? readConfig(row.today_grid_versions.config) : DEFAULT_CONFIG,
    versionId: row?.published_version_id ?? null,
  };
}

export function festivalFrom(row: { is_active?: boolean | null; tab_title?: string | null; title?: string | null } | null): FestivalInput {
  if (!row?.is_active) return { active: false, name: null };
  const name = row.tab_title?.trim() || row.title?.trim().replace(/^happy\s+/i, '') || null;
  return { active: !!name, name };
}
export async function readFestival(): Promise<FestivalInput> {
  const { data, error } = await supabase.from('festival_greeting').select('is_active, tab_title, title').limit(1).maybeSingle();
  if (error) throw error;
  return festivalFrom(data);
}
