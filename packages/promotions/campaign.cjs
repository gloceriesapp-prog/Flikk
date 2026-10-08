'use strict';
// One validation rule for queuing a promotional campaign, shared by the
// backend POST /admin/promotions (backend/src/promotions/router.ts) and the
// admin Promotions page route (apps/admin/src/app/api/promotions). Bounds
// match promotional_deliveries' CHECKs (migration 095). Explicit recipients
// only, never a broadcast to every customer.

const CHANNELS = ['sms', 'email'];
const MAX_RECIPIENTS = 100;
const SUBJECT_MAX = 120;
const BODY_MAX = 2000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class CampaignError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function isUuid(value) {
  return typeof value === 'string' && UUID.test(value);
}

function parseCampaign(input) {
  const { campaign_id, customer_ids, channel, subject, body } = input && typeof input === 'object' ? input : {};
  if (!isUuid(campaign_id)) throw new CampaignError('INVALID_ID', 'Invalid reference.');
  if (!CHANNELS.includes(channel) || !Array.isArray(customer_ids) || !customer_ids.length || customer_ids.length > MAX_RECIPIENTS ||
      typeof subject !== 'string' || !subject.trim() || subject.length > SUBJECT_MAX ||
      typeof body !== 'string' || !body.trim() || body.length > BODY_MAX) {
    throw new CampaignError('INVALID_CAMPAIGN', `Use one channel and up to ${MAX_RECIPIENTS} recipients with a subject and message.`);
  }
  if (!customer_ids.every(isUuid)) throw new CampaignError('INVALID_ID', 'Invalid reference.');
  return {
    campaignId: campaign_id,
    customerIds: [...new Set(customer_ids.map((id) => id.toLowerCase()))],
    channel,
    subject: subject.trim(),
    body: body.trim(),
  };
}

// The rows both callers write; the unique campaign/customer/channel key plus
// ignoreDuplicates makes a retried request a no-op instead of a resend.
function deliveryRows(campaign) {
  return campaign.customerIds.map((customer_id) => ({
    campaign_id: campaign.campaignId, customer_id, channel: campaign.channel, subject: campaign.subject, body: campaign.body,
  }));
}

module.exports = { CHANNELS, MAX_RECIPIENTS, SUBJECT_MAX, BODY_MAX, CampaignError, isUuid, parseCampaign, deliveryRows };
