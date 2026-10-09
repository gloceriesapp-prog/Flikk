export interface SmsHookConfig {
  enabled: boolean;
  hookSecrets: string[];
  authKey: string;
  templateId: string;
  otpVariable: string;
  perMinuteLimit: number;
  perDayLimit: number;
}

// Validate eagerly when enabled; other environments retain their dashboard provider.
export function readSmsHookConfig(source: NodeJS.ProcessEnv = process.env): SmsHookConfig {
  const provider = source.OTP_SMS_PROVIDER?.trim() || 'supabase';
  if (provider !== 'supabase' && provider !== 'msg91') throw new Error('OTP_SMS_PROVIDER must be supabase or msg91.');
  const enabled = provider === 'msg91';
  const hookSecrets = (source.SUPABASE_SEND_SMS_HOOK_SECRET || '').split('|').filter(Boolean);
  const authKey = source.MSG91_AUTH_KEY?.trim() || '';
  const templateId = source.MSG91_SMS_TEMPLATE_ID?.trim() || '';
  const otpVariable = source.MSG91_OTP_VARIABLE?.trim() || 'OTP';
  const perMinuteLimit = Number(source.MSG91_SMS_PER_MINUTE || '100');
  const perDayLimit = Number(source.MSG91_SMS_PER_DAY || '10000');
  if (enabled) {
    if (hookSecrets.length < 1 || hookSecrets.length > 2 || hookSecrets.some(secret => !/^v1,whsec_[A-Za-z0-9+/]{43}=$/.test(secret))) {
      throw new Error('SUPABASE_SEND_SMS_HOOK_SECRET must contain one or two 32-byte v1,whsec_ secrets separated by |.');
    }
    if (!/^[A-Za-z0-9]{16,128}$/.test(authKey)) throw new Error('MSG91_AUTH_KEY must be a valid server-side auth key.');
    if (!/^[a-fA-F0-9]{24}$/.test(templateId)) throw new Error('MSG91_SMS_TEMPLATE_ID must be the 24-character MSG91 SMS template ID.');
    if (!/^[A-Za-z][A-Za-z0-9_]{0,31}$/.test(otpVariable) || ['mobiles', 'constructor', '__proto__', 'prototype'].includes(otpVariable)) {
      throw new Error('MSG91_OTP_VARIABLE must match the approved template variable.');
    }
    if (!Number.isInteger(perMinuteLimit) || perMinuteLimit < 1 || perMinuteLimit > 500) throw new Error('MSG91_SMS_PER_MINUTE must be between 1 and 500.');
    if (!Number.isInteger(perDayLimit) || perDayLimit < 1 || perDayLimit > 1000000) throw new Error('MSG91_SMS_PER_DAY must be between 1 and 1000000.');
  }
  return { enabled, hookSecrets, authKey, templateId, otpVariable, perMinuteLimit, perDayLimit };
}
