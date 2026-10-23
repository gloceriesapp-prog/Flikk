// Self-check for parseLegalLinks: admin URLs win when they are https, anything
// else (missing, http, junk, a failed response) falls back to the published pages.
// Run: npx tsx apps/rider/src/api/legal.selfcheck.ts
import assert from 'node:assert';
import { FALLBACK_LEGAL_LINKS, parseLegalLinks } from './legalLinks';

assert.deepStrictEqual(
  parseLegalLinks({ legal: { privacyUrl: ' https://example.com/p ', termsUrl: 'https://example.com/t' } }),
  { privacyUrl: 'https://example.com/p', termsUrl: 'https://example.com/t' },
);
assert.deepStrictEqual(parseLegalLinks({ legal: { privacyUrl: 'http://example.com/p', termsUrl: null } }), FALLBACK_LEGAL_LINKS);
assert.deepStrictEqual(parseLegalLinks({ legal: { privacyUrl: 'javascript:alert(1)' } }), FALLBACK_LEGAL_LINKS);
assert.deepStrictEqual(parseLegalLinks(null), FALLBACK_LEGAL_LINKS);
assert.deepStrictEqual(parseLegalLinks({}), FALLBACK_LEGAL_LINKS);

console.log('legal links: ok');
