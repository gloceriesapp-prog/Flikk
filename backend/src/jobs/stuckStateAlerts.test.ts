import { expect, it, describe } from 'vitest';
import { summarizeStuckRefunds, STUCK_REFUND_MINUTES, STUCK_DISPATCH_MINUTES } from './stuckStateAlerts.js';
import { jobs } from '../workers/jobs.js';

const NOW = Date.parse('2026-10-10T12:00:00Z');
const minsAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();
const STUCK_MS = 15 * 60_000;

describe('summarizeStuckRefunds', () => {
  it('counts failed/manual_required as needing action regardless of age', () => {
    const rows = [
      { status: 'failed', updated_at: minsAgo(0) },
      { status: 'manual_required', updated_at: minsAgo(120) },
    ];
    expect(summarizeStuckRefunds(rows, NOW, STUCK_MS)).toEqual({ processingStuck: 0, needingAction: 2 });
  });

  it('counts queued/processing as stuck only once older than the threshold', () => {
    const rows = [
      { status: 'processing', updated_at: minsAgo(5) },   // fresh — not stuck
      { status: 'processing', updated_at: minsAgo(20) },  // past 15m — stuck
      { status: 'queued', updated_at: minsAgo(16) },      // past 15m — stuck
      { status: 'queued', updated_at: minsAgo(1) },       // fresh — not stuck
    ];
    expect(summarizeStuckRefunds(rows, NOW, STUCK_MS)).toEqual({ processingStuck: 2, needingAction: 0 });
  });

  it('treats a missing/unparseable timestamp as stuck (fail loud, not silent)', () => {
    const rows = [
      { status: 'processing', updated_at: null },
      { status: 'processing', updated_at: 'not-a-date' },
    ];
    expect(summarizeStuckRefunds(rows, NOW, STUCK_MS)).toEqual({ processingStuck: 2, needingAction: 0 });
  });

  it('ignores terminal/other statuses and empty input', () => {
    expect(summarizeStuckRefunds([], NOW, STUCK_MS)).toEqual({ processingStuck: 0, needingAction: 0 });
    expect(summarizeStuckRefunds([{ status: 'completed', updated_at: minsAgo(99) }], NOW, STUCK_MS))
      .toEqual({ processingStuck: 0, needingAction: 0 });
  });
});

it('is registered as a durable worker schedule with sane thresholds', () => {
  expect(jobs.stuckStateAlerts).toBeTypeOf('function');
  expect(STUCK_REFUND_MINUTES).toBeGreaterThan(0);
  expect(STUCK_DISPATCH_MINUTES).toBeGreaterThan(0);
});
