export type BuiltinHomeContentKey = 'grocery' | 'fresh' | 'regional' | 'festivals' | 'meat';
export type HomeContentKey = BuiltinHomeContentKey | `custom-${string}`;
export function isHomeContentKey(value: unknown): value is HomeContentKey;
export function customContentKey(homeTabId: string): HomeContentKey;
export function createCustomContent(title: string, enabled?: boolean): HomeContentDocument;
export type SectionKind =
  'products' | 'categories' | 'brands' | 'stores' | 'banner' | 'hero' | 'festival' | 'footer';
export type CategoryCardStyle = 'standard' | 'photo';
export function categoryCardStyle(section: HomeContentSection, tabKey?: HomeContentKey): CategoryCardStyle;
export interface ContentSelection {
  mode: 'automatic' | 'manual';
  productIds: string[];
  categoryIds: string[];
  storeIds: string[];
  includeTerms: string[];
  excludeTerms: string[];
  discountedOnly: boolean;
}
export interface HomeContentItem {
  id: string;
  title: string;
  enabled: boolean;
  imageUrl: string;
  backgroundColor: string;
  description: string;
  origin: string;
  selection: ContentSelection;
}
export type FreshPlacement = 'intro' | 'everyday' | 'village' | 'both';
export interface FreshTabs { everyday: string; village: string }
export const DEFAULT_FRESH_TABS: FreshTabs;
export function freshSectionPlacement(section: HomeContentSection, sections: HomeContentSection[]): FreshPlacement;
export interface HomeContentSection {
  freshPlacement?: FreshPlacement;
  id: string;
  kind: SectionKind;
  title: string;
  subtitle: string;
  enabled: boolean;
  layout: 'horizontal' | 'grid';
  categoryCardStyle?: CategoryCardStyle;
  columns: 2 | 3 | 4;
  limit: number;
  backgroundColor: string;
  imageUrl: string;
  imageAspectRatio: number;
  imageFade: boolean;
  showProductImages?: boolean;
  buttonEnabled: boolean;
  buttonLabel: string;
  hideWhenEmpty: boolean;
  selection: ContentSelection;
  items: HomeContentItem[];
}
export interface HomeContentDocument {
  freshTabs?: FreshTabs;
  schemaVersion: 1;
  tabTitle: string;
  headerImageUrl?: string;
  enabled: boolean;
  sections: HomeContentSection[];
}
export interface HomeContentRecord {
  freshTabs?: FreshTabs;
  freshSectionPlacements?: Record<string, FreshPlacement>;
  productImagesHiddenSectionIds?: string[];
  categoryCardStyles?: Record<string, CategoryCardStyle>;
  tabKey: HomeContentKey;
  homeTabId: string | null;
  revision: number;
  /** Public response artwork, outside the legacy strict content document. */
  headerImageUrl?: string;
  updatedAt: string;
  content: HomeContentDocument;
}
export const TAB_KEYS: readonly BuiltinHomeContentKey[];
export const SECTION_KINDS: readonly SectionKind[];
export const DEFAULT_CONTENT: Record<BuiltinHomeContentKey, HomeContentDocument>;
export function createSection(kind: SectionKind, id: string, title?: string): HomeContentSection;
export function createItem(id: string, title?: string): HomeContentItem;
export function validateContent(value: unknown): HomeContentDocument;
export function tabKeyForName(name: string): HomeContentKey | undefined;
export function referencedIds(content: HomeContentDocument): {
  productIds: string[];
  categoryIds: string[];
  storeIds: string[];
};
export function selectContentProducts<
  T extends {
    id: string;
    name: string;
    category: string;
    sub_category_id?: string | null;
    quick_tab_key?: string | null;
    store_id: string;
    price: number;
    original_price: number | null;
  },
>(products: T[], selection: ContentSelection, limit?: number): T[];

export function createFestivalSections(): HomeContentSection[];
export function addMissingFestivalSections(content: HomeContentDocument): HomeContentDocument;

export function hasContentSelection(rule: ContentSelection): boolean;
