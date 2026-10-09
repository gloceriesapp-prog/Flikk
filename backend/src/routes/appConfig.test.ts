import { expect, it } from 'vitest';
import { toAppConfig } from './appConfig.js';
import { validateAppContentInput } from '../../../apps/admin/src/lib/appContentValidation';

it('returns safe defaults when the singleton row is missing', () => {
  expect(toAppConfig(null)).toEqual({
    legal: { termsUrl: null, privacyUrl: null, refundPolicyUrl: null },
    support: { phone: null, email: null, whatsapp: null },
    about: { title: 'About Gloceries', body: '' },
    copy: {},
  });
});

it('strips empty strings to null and keeps only string copy values', () => {
  const config = toAppConfig({
    terms_url: 'https://gloceries.in/terms',
    privacy_url: '   ',
    refund_policy_url: '',
    support_phone: '+919876543210',
    support_email: '',
    support_whatsapp: null,
    about_title: ' ',
    about_body: 'We deliver from your local kirana.',
    copy: { 'home.mostBought.title': 'Most bought', 'bad.number': 5, 'bad.object': { a: 1 }, 'bad.null': null },
  });
  expect(config.legal).toEqual({ termsUrl: 'https://gloceries.in/terms', privacyUrl: null, refundPolicyUrl: null });
  expect(config.support).toEqual({ phone: '+919876543210', email: null, whatsapp: null });
  expect(config.about).toEqual({ title: 'About Gloceries', body: 'We deliver from your local kirana.' });
  expect(config.copy).toEqual({ 'home.mostBought.title': 'Most bought' });
});

it('ignores non-object copy payloads', () => {
  expect(toAppConfig({ copy: ['x'] }).copy).toEqual({});
  expect(toAppConfig({ copy: 'x' }).copy).toEqual({});
});

// Admin write-side validation (apps/admin) mirrors migration 100's CHECKs.
const valid = { aboutTitle: 'About', aboutBody: '', copy: {} };

it('admin validation normalises blanks to null and accepts good input', () => {
  const row = validateAppContentInput({ ...valid, termsUrl: ' https://x.in/t ', supportPhone: '', supportEmail: 'a@b.in', copy: { 'cart.empty.title': 'Empty' } });
  expect(row).toMatchObject({ terms_url: 'https://x.in/t', support_phone: null, support_email: 'a@b.in', copy: { 'cart.empty.title': 'Empty' } });
});

it.each([
  { termsUrl: 'http://x.in' },
  { supportPhone: '9876543210' },
  { supportEmail: 'nope' },
  { aboutTitle: ' ' },
  { copy: { Bad: 'x' } },
  { copy: { 'cart.title': 'x'.repeat(501) } },
  { copy: { 'cart.title': 5 } },
  { copy: Object.fromEntries(Array.from({ length: 301 }, (_, i) => [`k.k${i}`, 'x'])) },
])('admin validation rejects %o', (patch) => {
  expect(() => validateAppContentInput({ ...valid, ...patch })).toThrow();
});

it('admin validation requires https links for registered artwork keys and trims them', () => {
  const row = validateAppContentInput({ ...valid, copy: { 'home.welcome.imageUrl': ' https://cdn.x.in/a.webp ', 'home.welcome.label': ' Hi ' } });
  expect(row.copy).toEqual({ 'home.welcome.imageUrl': 'https://cdn.x.in/a.webp', 'home.welcome.label': ' Hi ' });
  expect(() => validateAppContentInput({ ...valid, copy: { 'stores.promo.imageUrl': 'http://x.in/a.png' } })).toThrow(/https/);
  expect(() => validateAppContentInput({ ...valid, copy: { 'home.groceries.headerImageUrl': 'not a link' } })).toThrow(/https/);
});
