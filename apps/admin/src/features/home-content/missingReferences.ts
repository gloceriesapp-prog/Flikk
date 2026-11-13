import type { ContentSelection, HomeContentDocument } from '@/lib/homeContent';

export const REFERENCE_KEYS = ['productIds', 'categoryIds', 'storeIds'] as const;
export type MissingReferences = Record<typeof REFERENCE_KEYS[number], string[]>;

export function parseMissingReferences(value: unknown): MissingReferences | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  if (!REFERENCE_KEYS.every(key => Array.isArray(input[key]) && input[key].every(id => typeof id === 'string'))) return null;
  return Object.fromEntries(REFERENCE_KEYS.map(key => [key, [...new Set(input[key] as string[])]])) as MissingReferences;
}

export function missingReferenceSummary(content: HomeContentDocument, missing: MissingReferences) {
  const sets = Object.fromEntries(REFERENCE_KEYS.map(key => [key, new Set(missing[key])])) as Record<typeof REFERENCE_KEYS[number], Set<string>>;
  return content.sections.flatMap(section => {
    const count = (selection: ContentSelection) => REFERENCE_KEYS.reduce((total, key) => total + selection[key].filter(id => sets[key].has(id)).length, 0);
    const entries = [{ label: section.title || section.id, selection: section.selection },
      ...section.items.map(item => ({ label: `${section.title || section.id} → ${item.title || item.id}`, selection: item.selection }))];
    return entries.flatMap(entry => {
      const total = count(entry.selection);
      return total ? [{ sectionId: section.id, label: entry.label, count: total, hidden: !section.enabled }] : [];
    });
  });
}

/** Only removes IDs confirmed absent by the server. Never clears a whole section,
 * changes selection mode, or removes existing/out-of-stock products.
 */
export function removeMissingReferences(content: HomeContentDocument, missing: MissingReferences): HomeContentDocument {
  const sets = Object.fromEntries(REFERENCE_KEYS.map(key => [key, new Set(missing[key])])) as Record<typeof REFERENCE_KEYS[number], Set<string>>;
  const clean = (selection: ContentSelection): ContentSelection => ({ ...selection,
    productIds: selection.productIds.filter(id => !sets.productIds.has(id)),
    categoryIds: selection.categoryIds.filter(id => !sets.categoryIds.has(id)),
    storeIds: selection.storeIds.filter(id => !sets.storeIds.has(id)),
  });
  return { ...content, sections: content.sections.map(section => ({ ...section, selection: clean(section.selection),
    items: section.items.map(item => ({ ...item, selection: clean(item.selection) })),
  })) };
}
