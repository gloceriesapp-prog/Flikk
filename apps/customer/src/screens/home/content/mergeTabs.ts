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
        name:
          config.tabKey === 'grocery'
            ? 'Groceries'
            : config.tabKey === 'fresh'
              ? 'Fresh'
              : 'Regional',
        contentKey: config.tabKey,
        label: config.content.tabTitle,
        tiles: [],
        banners: [],
      });
  }
  return result;
}
