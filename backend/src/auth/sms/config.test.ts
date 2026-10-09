import { describe, expect, it } from 'vitest';
import { readSmsHookConfig } from './config.js';
const configured = { OTP_SMS_PROVIDER: 'msg91', SUPABASE_SEND_SMS_HOOK_SECRET: `v1,whsec_${Buffer.alloc(32, 1).toString('base64')}`, MSG91_AUTH_KEY: '1'.repeat(32), MSG91_SMS_TEMPLATE_ID: '6ac7bde3ec8459c14b0cadb2' };
describe('SMS hook configuration', () => {
  it('retains dashboard provider unless explicitly activated', () => expect(readSmsHookConfig({}).enabled).toBe(false));
  it('defaults exact template variable and bounded quotas', () => expect(readSmsHookConfig(configured)).toMatchObject({ enabled: true, otpVariable: 'OTP', perMinuteLimit: 100, perDayLimit: 10000 }));
  it.each([{ OTP_SMS_PROVIDER: 'msg21' }, { MSG91_AUTH_KEY: '' }, { MSG91_SMS_TEMPLATE_ID: 'dlt-id' }, { SUPABASE_SEND_SMS_HOOK_SECRET: 'invalid' }, { MSG91_OTP_VARIABLE: 'mobiles' }, { MSG91_OTP_VARIABLE: '__proto__' }, { MSG91_SMS_PER_MINUTE: '501' }, { MSG91_SMS_PER_DAY: '0' }])('rejects invalid config %j', override => expect(() => readSmsHookConfig({ ...configured, ...override })).toThrow());
  it('permits two rotation secrets', () => expect(readSmsHookConfig({ ...configured, SUPABASE_SEND_SMS_HOOK_SECRET: `${configured.SUPABASE_SEND_SMS_HOOK_SECRET}|${configured.SUPABASE_SEND_SMS_HOOK_SECRET}` }).hookSecrets).toHaveLength(2));
});
