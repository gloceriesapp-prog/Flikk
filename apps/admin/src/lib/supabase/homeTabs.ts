// Maps between the real public.home_tabs/home_tab_tiles rows and this
// dashboard's HomeTab/HomeTabTile types (lib/types.ts), plus the two
// client-side reads the Home Categories page needs — covered by the public
// home_tabs_read_active/home_tab_tiles_read_active RLS policies. Writes
// live in app/api/home-tabs/* and app/api/home-tab-tiles/* instead, same
// rationale as lib/supabase/categories.ts's own note.

import { supabase } from './client';
import type { HomeTab, HomeTabBanner, HomeTabTile } from '../types';

export interface HomeTabRow {
  id: string;
  name: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface HomeTabTileRow {
  id: string;
  home_tab_id: string;
  name: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export const HOME_TAB_SELECT = 'id, name, image_url, sort_order, is_active';
export const HOME_TAB_TILE_SELECT = 'id, home_tab_id, name, image_url, sort_order, is_active';

export function mapRowToHomeTab(row: HomeTabRow): HomeTab {
  return { id: row.id, name: row.name, imageUrl: row.image_url ?? undefined, sortOrder: row.sort_order, isActive: row.is_active };
}

export function mapRowToHomeTabTile(row: HomeTabTileRow): HomeTabTile {
  return {
    id: row.id,
    homeTabId: row.home_tab_id,
    name: row.name,
    imageUrl: row.image_url ?? undefined,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

export async function fetchHomeTabs(): Promise<HomeTab[]> {
  const { data, error } = await supabase.from('home_tabs').select(HOME_TAB_SELECT).order('sort_order').order('name');
  if (error) throw error;
  return (data as HomeTabRow[]).map(mapRowToHomeTab);
}

export async function fetchHomeTabTiles(homeTabId: string): Promise<HomeTabTile[]> {
  const { data, error } = await supabase
    .from('home_tab_tiles')
    .select(HOME_TAB_TILE_SELECT)
    .eq('home_tab_id', homeTabId)
    .order('sort_order')
    .order('name');
  if (error) throw error;
  return (data as HomeTabTileRow[]).map(mapRowToHomeTabTile);
}

export interface HomeTabBannerRow {
  id: string;
  home_tab_id: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}

export const HOME_TAB_BANNER_SELECT = 'id, home_tab_id, image_url, sort_order, is_active';

export function mapRowToHomeTabBanner(row: HomeTabBannerRow): HomeTabBanner {
  return {
    id: row.id,
    homeTabId: row.home_tab_id,
    imageUrl: row.image_url,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

export async function fetchHomeTabBanners(homeTabId: string): Promise<HomeTabBanner[]> {
  const { data, error } = await supabase
    .from('home_tab_banners')
    .select(HOME_TAB_BANNER_SELECT)
    .eq('home_tab_id', homeTabId)
    .order('sort_order');
  if (error) throw error;
  return (data as HomeTabBannerRow[]).map(mapRowToHomeTabBanner);
}
