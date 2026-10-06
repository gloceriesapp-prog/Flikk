export type HomeContentKey = 'grocery' | 'fresh' | 'regional';
export type SectionKind =
  'products' | 'categories' | 'brands' | 'stores' | 'banner' | 'hero' | 'footer';
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
export interface HomeContentSection {
  id: string;
  kind: SectionKind;
  title: string;
  subtitle: string;
  enabled: boolean;
  layout: 'horizontal' | 'grid';
  columns: 2 | 3 | 4;
  limit: number;
  backgroundColor: string;
  imageUrl: string;
  imageAspectRatio: number;
  imageFade: boolean;
  buttonEnabled: boolean;
  buttonLabel: string;
  hideWhenEmpty: boolean;
  selection: ContentSelection;
  items: HomeContentItem[];
}
export interface HomeContentDocument {
  schemaVersion: 1;
  tabTitle: string;
  enabled: boolean;
  sections: HomeContentSection[];
}
export interface HomeContentRecord {
  tabKey: HomeContentKey;
  homeTabId: string | null;
  revision: number;
  updatedAt: string;
  content: HomeContentDocument;
}
export const TAB_KEYS: readonly HomeContentKey[];
export const SECTION_KINDS: readonly SectionKind[];
export const DEFAULT_CONTENT: Record<HomeContentKey, HomeContentDocument>;
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
    store_id: string;
    price: number;
    original_price: number | null;
  },
>(products: T[], selection: ContentSelection, limit?: number): T[];
