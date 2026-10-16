// Runnable self-check for the background-location disclosure decision:
// `npx tsx src/location/backgroundDisclosure.selfcheck.ts` from apps/rider.

import assert from 'node:assert';
import { classifyBackgroundPermission, DECLINE_COOLDOWN_MS, disclosureAction, parseDeclinedAt } from './backgroundDisclosure';

const NOW = 1_800_000_000_000;

// classify
assert.equal(classifyBackgroundPermission(null), 'unavailable');
assert.equal(classifyBackgroundPermission({ granted: true, canAskAgain: false }), 'granted');
assert.equal(classifyBackgroundPermission({ granted: true, canAskAgain: true }), 'granted');
assert.equal(classifyBackgroundPermission({ granted: false, canAskAgain: true }), 'askable');
assert.equal(classifyBackgroundPermission({ granted: false, canAskAgain: false }), 'settings_only');

// granted / unavailable never show, whatever the decline history
assert.equal(disclosureAction('granted', null, NOW), 'none');
assert.equal(disclosureAction('unavailable', null, NOW), 'none');

// first time: disclosure, then the right next step
assert.equal(disclosureAction('askable', null, NOW), 'request');
assert.equal(disclosureAction('settings_only', null, NOW), 'open_settings');

// declined recently: quiet; after the cooldown: ask again
assert.equal(disclosureAction('askable', NOW - 60_000, NOW), 'none');
assert.equal(disclosureAction('settings_only', NOW - (DECLINE_COOLDOWN_MS - 1), NOW), 'none');
assert.equal(disclosureAction('askable', NOW - DECLINE_COOLDOWN_MS, NOW), 'request');

// a corrupt stored value never suppresses the disclosure forever
assert.equal(disclosureAction('askable', Number.NaN, NOW), 'request');
assert.equal(parseDeclinedAt(null), null);
assert.equal(parseDeclinedAt(''), null);
assert.equal(parseDeclinedAt('garbage'), null);
assert.equal(parseDeclinedAt('-5'), null);
assert.equal(parseDeclinedAt(String(NOW)), NOW);

console.log('backgroundDisclosure selfcheck: ok');
