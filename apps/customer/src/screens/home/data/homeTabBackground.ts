import type { RemoteHomeTab } from './useHomeTabs';
import { isFestivalTabName, NAVRATRI_FESTIVAL } from '../festival/data';

export const HOME_BODY_BACKGROUND = '#FFFFFF';

// Resolve the content surface, rather than the header gradient. Managed tabs
// keep their identity when an admin changes their display name.
export function homeTabBackground(tab?: Pick<RemoteHomeTab, 'name' | 'contentKey'>) {
  return tab && !tab.contentKey && isFestivalTabName(tab.name)
    ? NAVRATRI_FESTIVAL.backgroundColor
    : HOME_BODY_BACKGROUND;
}
