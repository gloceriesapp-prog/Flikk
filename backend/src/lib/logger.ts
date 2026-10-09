// Structured logging — replaces plain console.log/error with real,
// leveled, parseable output. Pretty-printed (colorized, human-readable)
// in dev via pino-pretty; plain JSON in production, since that's what a
// real log aggregator (Railway/Render's own log viewer, per CLAUDE.md)
// actually wants to ingest — pretty-printing there would just make every
// line harder to grep/parse.
import pino, { type LoggerOptions } from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

// Error messages/cause objects can embed provider URLs, headers or SQL values.
// Keep bounded stack frames and machine codes, never arbitrary provider text.
export function safeError(error: unknown) {
  if (!error || typeof error !== 'object') return { type: 'UnknownError' };
  const value = error as { name?: unknown; code?: unknown; stack?: unknown };
  return {
    type: typeof value.name === 'string' && /^[A-Za-z]+Error$/.test(value.name) ? value.name : 'Error',
    code: typeof value.code === 'string' && /^[A-Z0-9_]{1,64}$/.test(value.code) ? value.code : undefined,
    stack: typeof value.stack === 'string' ? value.stack.split('\n').slice(1, 12).filter(line => /^\s+at /.test(line)).join('\n') : undefined,
  };
}

export const loggerOptions: LoggerOptions = {
  hooks: {
    logMethod(args, method) {
      if (args[0] instanceof Error) args[0] = { err: args[0] };
      if (args[0] && typeof args[0] === 'object' && 'err' in args[0] && args.length === 1)
        args.push('Operation failed'); // Pino otherwise copies raw err.message into msg.
      method.apply(this, args);
    },
  },
  serializers: { err: safeError },
  // Never retain request/provider credentials, cookies, OTPs or payment secrets.
  redact: {
    paths: [
      'req.headers', 'req.headers.authorization', 'req.headers.cookie', 'req.headers["x-api-key"]',
      'res.headers["set-cookie"]', 'authorization', 'Authorization', 'password',
      'authkey', 'MSG91_AUTH_KEY', 'SUPABASE_SEND_SMS_HOOK_SECRET', 'SUPABASE_AUTH_SECRET_KEY',
      '*.authkey', '*.authKey', '*.hookSecrets', '*.webhook-signature',
      'otp', 'delivery_otp', 'code', 'access_token', 'refresh_token',
      '*.authorization', '*.Authorization', '*.password', '*.otp', '*.delivery_otp',
      '*.access_token', '*.refresh_token', '*.api_key', '*.apiKey', '*.client_secret', '*.secret', '*.cashfreeSecretKey', '*.cashfreeWebhookSecret', '*.cashfreeVerificationSecret',
      '*["x-client-secret"]', '*["x-client-id"]', '*["x-webhook-signature"]', '*.payment_session_id', '*.paymentSessionId',
      'err.config.headers', 'err.request',
      'req.body', 'req.query', 'req.url',
    ],
    censor: '[REDACTED]',
  },
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  transport: isDev
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
    : undefined,
};

export const logger = pino(loggerOptions);
