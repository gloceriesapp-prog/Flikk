import type { RemoteHomeTab } from './useHomeTabs';

export const HOME_BODY_BACKGROUND = '#FFFFFF';

// Resolve the content surface, rather than the header gradient. The admin
// festival tab uses its configured background (festival_greeting, 112).
export function homeTabBackground(tab?: Pick<RemoteHomeTab, 'festival'>) {
  return tab?.festival?.backgroundColor ?? HOME_BODY_BACKGROUND;
}
