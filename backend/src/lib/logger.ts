// Structured logging — replaces plain console.log/error with real,
// leveled, parseable output. Pretty-printed (colorized, human-readable)
// in dev via pino-pretty; plain JSON in production, since that's what a
// real log aggregator (Railway/Render's own log viewer, per CLAUDE.md)
// actually wants to ingest — pretty-printing there would just make every
// line harder to grep/parse.
import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  transport: isDev
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
    : undefined,
});
