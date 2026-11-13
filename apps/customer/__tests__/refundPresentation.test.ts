import { REFUND_LABELS, refundPresentation, refundReason } from '../src/features/customer-care/refundPresentation';
test('only announces initiation after the provider accepted a refund', () => {
 expect(refundPresentation('processing').title).toBe('Refund requested');
 expect(refundPresentation('processing', 'rfnd_accepted').title).toBe('Refund initiated');
 expect(refundPresentation('processing', 'rfnd_accepted').message).toContain('original payment method');
});
test('keeps requested, completed and support states distinct', () => {
 expect(refundPresentation('queued').message).toContain('queued');
 expect(refundPresentation('completed', 'rfnd_done').title).toBe('Refund completed');
 for (const status of ['failed','manual_required']) expect(refundPresentation(status).message).toContain('Contact support');
 expect(REFUND_LABELS.manual_required).toBeTruthy();
 expect(refundPresentation('unexpected').title).toBe('Refund requested');
 expect(refundReason('store_no_response')).toBe('Store did not accept the order in time');
});
