// Home-tab + home-tab-tile write-path validation + row mapping — used by
// app/api/home-tabs/* and app/api/home-tab-tiles/*, same "one place, not
// two copies" pattern as lib/categoryValidation.ts. Deliberately separate
// types/tables from categories/sub_categories — see lib/types.ts's own
// note on why.

import type { HomeTabTileLinkType } from './types';

export interface HomeTabWriteInput {
  name: string;
  imageUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export function validateHomeTabInput(input: Partial<HomeTabWriteInput>): asserts input is HomeTabWriteInput {
  if (!input.name || !input.name.trim()) throw new Error('Tab name is required.');
}

export interface HomeTabRow {
  name: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export function toHomeTabRow(input: HomeTabWriteInput): HomeTabRow {
  return {
    name: input.name.trim(),
    image_url: input.imageUrl?.trim() || null,
    sort_order: input.sortOrder ?? 0,
    is_active: input.isActive ?? true,
  };
}

export interface HomeTabTileWriteInput {
  homeTabId: string;
  name: string;
  imageUrl?: string | null;
  sortOrder?: number;
  linkType?: string | null;
  linkId?: string | null;
}

export function validateHomeTabTileInput(input: Partial<HomeTabTileWriteInput>): asserts input is HomeTabTileWriteInput {
  if (!input.homeTabId) throw new Error('homeTabId is required.');
  if (!input.name || !input.name.trim()) throw new Error('Tile name is required.');
  toHomeTabTileLink(input.linkType, input.linkId);
}

const TILE_LINK_TYPES: HomeTabTileLinkType[] = ['category', 'subcategory', 'store'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 'none'/empty clears both columns; a real type needs a real target id.
export function toHomeTabTileLink(linkType: unknown, linkId: unknown): { link_type: HomeTabTileLinkType | null; link_id: string | null } {
  if (linkType == null || linkType === '' || linkType === 'none') return { link_type: null, link_id: null };
  if (!TILE_LINK_TYPES.includes(linkType as HomeTabTileLinkType)) throw new Error('Tile link must be a category, subcategory or store.');
  if (typeof linkId !== 'string' || !UUID.test(linkId)) throw new Error('Pick what the tile should open.');
  return { link_type: linkType as HomeTabTileLinkType, link_id: linkId };
}

export interface HomeTabTileRow {
  home_tab_id: string;
  name: string;
  image_url: string | null;
  sort_order: number;
  link_type: HomeTabTileLinkType | null;
  link_id: string | null;
}

export function toHomeTabTileRow(input: HomeTabTileWriteInput): HomeTabTileRow {
  return {
    home_tab_id: input.homeTabId,
    name: input.name.trim(),
    image_url: input.imageUrl?.trim() || null,
    sort_order: input.sortOrder ?? 0,
    ...toHomeTabTileLink(input.linkType, input.linkId),
  };
}

// Image only, no badge/heading/subheading text — per an explicit ask to
// drop the text fields entirely and keep this a pure image poster.
export interface HomeTabBannerWriteInput {
  homeTabId: string;
  imageUrl: string;
  sortOrder?: number;
}

export function validateHomeTabBannerInput(input: Partial<HomeTabBannerWriteInput>): asserts input is HomeTabBannerWriteInput {
  if (!input.homeTabId) throw new Error('homeTabId is required.');
  if (!input.imageUrl || !input.imageUrl.trim()) throw new Error('Banner photo is required.');
}

export interface HomeTabBannerRow {
  home_tab_id: string;
  image_url: string;
  sort_order: number;
}

export function toHomeTabBannerRow(input: HomeTabBannerWriteInput): HomeTabBannerRow {
  return {
    home_tab_id: input.homeTabId,
    image_url: input.imageUrl.trim(),
    sort_order: input.sortOrder ?? 0,
  };
}

// Same PostgrestError-isn't-an-Error-instance gotcha as
// lib/categoryValidation.ts's own toCategoryErrorMessage — 23505 is
// Postgres's unique-violation code (home_tabs.name globally unique,
// home_tab_tiles unique per (home_tab_id, name)).
export function toHomeTabErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'code' in err && (err as { code: unknown }).code === '23505') {
    return 'That name is already used here — pick a different one.';
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
