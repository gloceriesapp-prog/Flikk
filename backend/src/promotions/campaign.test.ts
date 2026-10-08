import { describe, expect, it } from 'vitest';
import { CampaignError, deliveryRows, parseCampaign } from '../../../packages/promotions/campaign.cjs';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const valid = { campaign_id: id(1), customer_ids: [id(2), id(2).toUpperCase(), id(3)], channel: 'sms', subject: ' Diwali ', body: ' 10% off ' };
const code = (input: unknown) => { try { parseCampaign(input); return 'ok'; } catch (e) { return e instanceof CampaignError ? e.code : 'other'; } };

describe('shared promotional campaign validation', () => {
  it('trims content, de-duplicates recipients and builds idempotent rows', () => {
    const campaign = parseCampaign(valid);
    expect(campaign).toEqual({ campaignId: id(1), customerIds: [id(2), id(3)], channel: 'sms', subject: 'Diwali', body: '10% off' });
    expect(deliveryRows(campaign)).toEqual([
      { campaign_id: id(1), customer_id: id(2), channel: 'sms', subject: 'Diwali', body: '10% off' },
      { campaign_id: id(1), customer_id: id(3), channel: 'sms', subject: 'Diwali', body: '10% off' },
    ]);
  });
  it('refuses broadcasts, unknown channels and oversized content', () => {
    expect(code({ ...valid, campaign_id: 'x' })).toBe('INVALID_ID');
    expect(code({ ...valid, customer_ids: ['nope'] })).toBe('INVALID_ID');
    expect(code({ ...valid, customer_ids: [] })).toBe('INVALID_CAMPAIGN');
    expect(code({ ...valid, customer_ids: Array.from({ length: 101 }, (_, i) => id(i + 10)) })).toBe('INVALID_CAMPAIGN');
    expect(code({ ...valid, channel: 'push' })).toBe('INVALID_CAMPAIGN');
    expect(code({ ...valid, subject: 'x'.repeat(121) })).toBe('INVALID_CAMPAIGN');
    expect(code({ ...valid, body: '   ' })).toBe('INVALID_CAMPAIGN');
    expect(code({ ...valid, body: 'x'.repeat(2001) })).toBe('INVALID_CAMPAIGN');
    expect(code(null)).toBe('INVALID_ID');
  });
});
