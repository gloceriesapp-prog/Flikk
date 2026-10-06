import { expect, it } from 'vitest';
import { ticketInput, message, pageOffset, supportError } from './contracts.js';
const id = '00000000-0000-4000-8000-000000000001';
it('requires an order for item, payment and delivery problems', () => {
    for (const category of ['missing_items', 'damaged_products', 'payment', 'delivery'])
        expect(() => ticketInput({ request_id: id, category, message: 'Please help with my order' })).toThrow('Choose the relevant order');
    expect(ticketInput({ request_id: id, category: 'general', message: 'I need help signing in' }).p_order_id).toBeNull();
});
it('rejects mixed targets and malformed identifiers', () => {
    expect(() => ticketInput({ request_id: id, order_id: id, trip_id: id, category: 'payment', message: 'Payment problem' })).toThrow();
    expect(() => ticketInput({ request_id: 'bad', order_id: id, category: 'payment', message: 'Payment problem' })).toThrow();
});
it('trims input and bounds message and page sizes', () => {
    expect(message(' hello ')).toBe('hello');
    expect(() => message('x'.repeat(2001))).toThrow();
    expect(() => message('  ')).toThrow();
    expect(pageOffset('25')).toBe(25);
    for (const value of ['NaN', '-1', '25.5', '999999'])
        expect(() => pageOffset(value)).toThrow();
});
it('distinguishes unavailable targets, conflicts, limits and temporary failures', () => {
    expect(supportError({ code: 'P0404' }).status).toBe(404);
    expect(supportError({ code: 'P0409' }).status).toBe(409);
    expect(supportError({ code: 'P0429' }).status).toBe(429);
    expect(supportError({ code: '08006' }).status).toBe(503);
});
