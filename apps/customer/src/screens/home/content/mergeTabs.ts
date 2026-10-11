import { tabKeyForName, type HomeContentRecord } from './contracts';
import type { RemoteHomeTab } from '../data/useHomeTabs';

export function mergeManagedTabs(
  tabs: RemoteHomeTab[],
  content: HomeContentRecord[] | undefined,
): RemoteHomeTab[] {
  if (!content) return tabs;
  const seen = new Set<string>();
  const result: RemoteHomeTab[] = [];
  for (const tab of tabs) {
    const config =
      content.find((record) => record.homeTabId === tab.id) ??
      content.find((record) => !record.homeTabId && record.tabKey === tabKeyForName(tab.name));
    if (!config) {
      result.push(tab);
      continue;
    }
    if (seen.has(config.tabKey)) continue;
    seen.add(config.tabKey);
    if (config.content.enabled)
      result.push({ ...tab, contentKey: config.tabKey, label: config.content.tabTitle });
  }
  for (const config of content) {
    if (!seen.has(config.tabKey) && config.content.enabled)
      result.push({
        id: config.homeTabId ?? `home-content-${config.tabKey}`,
        name: SYNTHETIC_TAB_NAME[config.tabKey] ?? config.content.tabTitle,
        contentKey: config.tabKey,
        label: config.content.tabTitle,
        tiles: [],
        banners: [],
      });
  }
  return result;
}

// Internal name for a content tab with no linked home_tabs row — drives the
// icon/gradient lookup (keyed by lowercase name). contentKey drives the actual
// body template, so this only affects the tab-strip chrome.
const SYNTHETIC_TAB_NAME: Record<string, string> = {
  grocery: 'Groceries',
  fresh: 'Fresh',
  regional: 'Regional',
  festivals: 'Festivals',
  meat: 'Meat',
};
