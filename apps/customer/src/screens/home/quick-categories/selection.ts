import type { RemoteHomeTab } from '../data/useHomeTabs';

// Explicit per-tile controls override legacy name-based hiding. No configured
// target means the existing Home tab; a removed/inactive target stays hidden.
export function selectQuickCategoryTabs(tabs: RemoteHomeTab[], hiddenNames: Set<string>): RemoteHomeTab[] {
  return tabs.map((tab, index) => ({ tab, index })).filter(({ tab }) => {
    const legacyVisible = !hiddenNames.has(tab.name.trim().toLowerCase()) && !hiddenNames.has((tab.label ?? '').trim().toLowerCase());
    return (tab.quickCategory?.visible ?? legacyVisible) && (!tab.quickCategory?.configured || !!tab.quickCategory.link);
  }).sort((a, b) => (a.tab.quickCategory?.order ?? a.index) - (b.tab.quickCategory?.order ?? b.index) || a.index - b.index)
    .map(({ tab }) => tab);
}
