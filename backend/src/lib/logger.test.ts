import { expect, it } from 'vitest';
import { Writable } from 'node:stream';
import pino from 'pino';
import { loggerOptions } from './logger.js';
it('redacts request credentials, query URLs and nested tokens from emitted JSON', () => {
    let output = '';
    const stream = new Writable({ write(chunk, _encoding, done) { output += chunk.toString(); done(); } });
    pino({ ...loggerOptions, transport: undefined }, stream).info({ req: { headers: { authorization: 'private-bearer', cookie: 'private-cookie' }, url: '/?token=private-url', body: { otp: 'private-code' } }, session: { access_token: 'private-access', refresh_token: 'private-refresh' } });
    expect(output).not.toContain('private-');
    expect(output).toContain('[REDACTED]');
});

it('does not serialize provider error text or nested request secrets', () => {
  let output='';const stream=new Writable({write(chunk,_encoding,done){output+=chunk.toString();done();}});
  const error=Object.assign(new Error('provider URL includes private-secret'), {code:'ECONNRESET',cause:{token:'private-secret'},request:{authorization:'private-secret'}});
  pino({...loggerOptions,transport:undefined},stream).error({err:error});
  expect(output).not.toContain('private-secret');expect(output).toContain('ECONNRESET');
});

it('redacts SMS provider keys and hook signing secrets', () => {
  let output = '';
  const stream = new Writable({ write(chunk, _encoding, done) { output += chunk.toString(); done(); } });
  pino({ ...loggerOptions, transport: undefined }, stream).info({ authkey: 'private-provider-key',
    MSG91_AUTH_KEY: 'private-env-key', SUPABASE_SEND_SMS_HOOK_SECRET: 'private-hook-secret',
    sms: { authKey: 'private-nested-key', hookSecrets: ['private-rotation-key'] } });
  expect(output).not.toContain('private-');
});
