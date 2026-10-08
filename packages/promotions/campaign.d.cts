export type PromotionChannel = 'sms' | 'email';
export const CHANNELS: readonly PromotionChannel[];
export const MAX_RECIPIENTS: number;
export const SUBJECT_MAX: number;
export const BODY_MAX: number;
export class CampaignError extends Error { code: 'INVALID_ID' | 'INVALID_CAMPAIGN'; constructor(code: string, message: string); }
export interface Campaign { campaignId: string; customerIds: string[]; channel: PromotionChannel; subject: string; body: string }
export interface DeliveryRow { campaign_id: string; customer_id: string; channel: PromotionChannel; subject: string; body: string }
export function isUuid(value: unknown): value is string;
export function parseCampaign(input: unknown): Campaign;
export function deliveryRows(campaign: Campaign): DeliveryRow[];
