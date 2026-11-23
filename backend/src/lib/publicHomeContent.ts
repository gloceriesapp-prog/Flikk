import type { FreshTabs, FreshPlacement, CategoryCardStyle } from '../../../packages/home-content/index.js';

/** Older installed clients reject unknown fields inside version-1 documents. */
export function publicHomeContent(value: unknown): {
  content: unknown;
  freshTabs?: FreshTabs;
  freshSectionPlacements?: Record<string, FreshPlacement>;
  headerImageUrl?: string;
  productImagesHiddenSectionIds?: string[];
  categoryCardStyles?: Record<string, CategoryCardStyle>;
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { content: value };
  const { headerImageUrl, freshTabs, ...content } = value as Record<string, unknown>;
  const productImagesHiddenSectionIds: string[] = [];
  const freshSectionPlacements = new Map<string, FreshPlacement>();
  const categoryCardStyles = new Map<string, CategoryCardStyle>();
  if (Array.isArray(content.sections)) {
    content.sections = content.sections.map((section: unknown) => {
      if (!section || typeof section !== 'object' || Array.isArray(section)) return section;
      const { showProductImages, categoryCardStyle, freshPlacement, ...legacySection } = section as Record<string, unknown>;
      if (legacySection.kind === 'hero' && typeof legacySection.id === 'string' && showProductImages === false) {
        productImagesHiddenSectionIds.push(legacySection.id);
      }
      if (legacySection.kind === 'categories' && typeof legacySection.id === 'string' &&
          (categoryCardStyle === 'standard' || categoryCardStyle === 'photo')) {
        categoryCardStyles.set(legacySection.id, categoryCardStyle);
      }
      if (typeof legacySection.id === 'string' && ['intro', 'everyday', 'village', 'both'].includes(freshPlacement as string)) {
        freshSectionPlacements.set(legacySection.id, freshPlacement as FreshPlacement);
      }
      return legacySection;
    });
  }
  return {
    content,
    ...(freshTabs ? { freshTabs: freshTabs as FreshTabs } : {}),
    ...(freshSectionPlacements.size ? { freshSectionPlacements: Object.fromEntries(freshSectionPlacements) } : {}),
    ...(typeof headerImageUrl === 'string' && headerImageUrl ? { headerImageUrl } : {}),
    ...(categoryCardStyles.size > 0 ? { categoryCardStyles: Object.fromEntries(categoryCardStyles) } : {}),
    ...(productImagesHiddenSectionIds.length > 0 ? { productImagesHiddenSectionIds } : {}),
  };
}
