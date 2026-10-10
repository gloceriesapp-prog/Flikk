// Runnable self-check for the Home tab-switcher gating helper. No framework:
// `npx tsx src/screens/home/data/categoryTabs.selfcheck.ts` from apps/customer.
// Guards the fix for GAP #1: the switcher must appear iff the admin has
// published real tabs — never a lone "All" capsule, and no empty bar flash
// while the (initially []) tab list is still loading.

import assert from 'node:assert';
import { shouldShowTabs } from './categoryTabs';
import type { RemoteHomeTab } from './useHomeTabs';

const tab = (id: string): RemoteHomeTab => ({ id, name: id, tiles: [], banners: [] });

// No published tabs (empty config, or still loading -> realTabs defaults []).
assert.equal(shouldShowTabs([]), false, 'no published tabs must stay All-only');

// One or more published tabs -> show the switcher.
assert.equal(shouldShowTabs([tab('groceries')]), true, 'one tab shows the switcher');
assert.equal(shouldShowTabs([tab('groceries'), tab('fresh')]), true, 'many tabs show the switcher');

console.log('categoryTabs selfcheck ok');
