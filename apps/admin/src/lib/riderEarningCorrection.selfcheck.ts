// ponytail: one runnable self-check for the rider-earning correction money
// logic — rupees->paise parsing (the fat-finger surface) and the client-side
// bounds that mirror the RPC. Run: npx tsx src/lib/riderEarningCorrection.selfcheck.ts
import assert from 'node:assert/strict';
import { rupeesToPaise, validateCorrectionInput, MAX_CORRECTION_PAISE } from './riderEarningCorrection';

// Parsing: whole rupees, one/two decimals, surrounding space.
assert.equal(rupeesToPaise('50'), 5000);
assert.equal(rupeesToPaise('50.5'), 5050);
assert.equal(rupeesToPaise('50.55'), 5055);
assert.equal(rupeesToPaise('  12.00  '), 1200);
assert.equal(rupeesToPaise('0.01'), 1);

// Parsing rejects: blank, non-numeric, 3+ decimals, negative, sign.
for (const bad of ['', 'abc', '12.345', '-5', '+5', '12.', '.5', '1,200']) {
  assert.equal(rupeesToPaise(bad), null, `expected null for ${JSON.stringify(bad)}`);
}

// Validation: happy path trims the reason.
const ok = validateCorrectionInput({ amountPaise: 5000, reason: '  wrong extra stop fee  ' });
assert.deepEqual(ok, { ok: true, amountPaise: 5000, reason: 'wrong extra stop fee' });

// Validation rejects: non-int, zero, negative, over ceiling, blank/oversize reason.
assert.equal(validateCorrectionInput({ amountPaise: 50.5, reason: 'x' }).ok, false);
assert.equal(validateCorrectionInput({ amountPaise: 0, reason: 'x' }).ok, false);
assert.equal(validateCorrectionInput({ amountPaise: -1, reason: 'x' }).ok, false);
assert.equal(validateCorrectionInput({ amountPaise: MAX_CORRECTION_PAISE + 1, reason: 'x' }).ok, false);
assert.equal(validateCorrectionInput({ amountPaise: MAX_CORRECTION_PAISE, reason: 'x' }).ok, true);
assert.equal(validateCorrectionInput({ amountPaise: 5000, reason: '' }).ok, false);
assert.equal(validateCorrectionInput({ amountPaise: 5000, reason: 'r'.repeat(301) }).ok, false);

console.log('riderEarningCorrection.selfcheck OK');
