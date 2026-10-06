import { expect, it } from 'vitest';
import { sanitizeErrorText } from '../../../apps/customer/src/observability/sanitize';
it('strips account identifiers, credentials and URL queries from crash messages', () => {
  const clean = sanitizeErrorText('Bearer secret-token test@example.com +91 99999 88888 https://example.com/path?token=secret');
  for (const sensitive of ['secret-token', 'test@example.com', '99999', 'token=secret']) expect(clean).not.toContain(sensitive);
});
