import { expect, it } from 'vitest';
import { staffTicketInput, supportError } from './contracts.js';
import { toSupportContacts } from '../routes/appConfig.js';
import { validateSupportContactsInput } from '../../../apps/admin/src/lib/appSettingsValidation';

const id = '00000000-0000-4000-8000-000000000001';

it('accepts rider/partner categories with an optional order', () => {
  expect(staffTicketInput({ request_id: id, category: 'payout', message: 'My payout did not arrive' })).toEqual({
    p_request_id: id, p_order_id: null, p_category: 'payout', p_message: 'My payout did not arrive',
  });
  expect(staffTicketInput({ request_id: id, order_id: id, category: 'order_issue', message: 'Customer not reachable' }).p_order_id).toBe(id);
  expect(staffTicketInput({ request_id: id, order_id: '', category: 'general', message: 'General question here' }).p_order_id).toBeNull();
});

it('rejects customer categories, bad ids and short messages for staff tickets', () => {
  expect(() => staffTicketInput({ request_id: id, category: 'missing_items', message: 'Something is missing' })).toThrow('Choose an issue type');
  expect(() => staffTicketInput({ request_id: id, order_id: 'nope', category: 'order_issue', message: 'Order problem here' })).toThrow();
  expect(() => staffTicketInput({ request_id: id, category: 'account', message: 'short' })).toThrow();
  expect(supportError({ code: 'P0400' }).status).toBe(400);
});

it('serves per-app contacts and falls back to the general contact per field', () => {
  expect(toSupportContacts(null, null)).toEqual({ phone: null, email: null, whatsapp: null });
  expect(toSupportContacts(
    { support_phone: '+919800000001', support_email: ' ', support_whatsapp: null },
    { support_phone: '+919800000009', support_email: 'help@gloceries.in', support_whatsapp: '+919800000008' },
  )).toEqual({ phone: '+919800000001', email: 'help@gloceries.in', whatsapp: '+919800000008' });
});

it('admin contact validation normalises numbers and rejects bad input', () => {
  expect(validateSupportContactsInput({ app: 'rider', phone: '98765 43210', email: ' riders@gloceries.in ', whatsapp: '' })).toEqual({
    app: 'rider', support_phone: '+919876543210', support_email: 'riders@gloceries.in', support_whatsapp: null,
  });
  expect(() => validateSupportContactsInput({ app: 'customer' })).toThrow();
  expect(() => validateSupportContactsInput({ app: 'partner', phone: '12345' })).toThrow();
  expect(() => validateSupportContactsInput({ app: 'partner', email: 'not-an-email' })).toThrow();
});
