import type { CategoryCardStyle } from '../../../packages/home-content/index.js';

/** Older installed clients reject unknown fields inside version-1 documents. */
export function publicHomeContent(value: unknown): {
  content: unknown;
  headerImageUrl?: string;
  productImagesHiddenSectionIds?: string[];
  categoryCardStyles?: Record<string, CategoryCardStyle>;
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { content: value };
  const { headerImageUrl, ...content } = value as Record<string, unknown>;
  const productImagesHiddenSectionIds: string[] = [];
  const categoryCardStyles = new Map<string, CategoryCardStyle>();
  if (Array.isArray(content.sections)) {
    content.sections = content.sections.map((section: unknown) => {
      if (!section || typeof section !== 'object' || Array.isArray(section)) return section;
      const { showProductImages, categoryCardStyle, ...legacySection } = section as Record<string, unknown>;
      if (legacySection.kind === 'hero' && typeof legacySection.id === 'string' && showProductImages === false) {
        productImagesHiddenSectionIds.push(legacySection.id);
      }
      if (legacySection.kind === 'categories' && typeof legacySection.id === 'string' &&
          (categoryCardStyle === 'standard' || categoryCardStyle === 'photo')) {
        categoryCardStyles.set(legacySection.id, categoryCardStyle);
      }
      return legacySection;
    });
  }
  return {
    content,
    ...(typeof headerImageUrl === 'string' && headerImageUrl ? { headerImageUrl } : {}),
    ...(categoryCardStyles.size > 0 ? { categoryCardStyles: Object.fromEntries(categoryCardStyles) } : {}),
    ...(productImagesHiddenSectionIds.length > 0 ? { productImagesHiddenSectionIds } : {}),
  };
}
