import { describe, expect, it, vi } from 'vitest';
import { StreamAdmission, streamLimit, writeStreamFrame } from './admission.js';
describe('SSE admission', () => {
  it('bounds total and IP connections and releases exactly once', () => {
    const budget = new StreamAdmission(2, 1);
    const release = budget.acquire('a')!;
    expect(budget.acquire('a')).toBeNull();
    expect(budget.acquire('b')).not.toBeNull();
    expect(budget.acquire('c')).toBeNull();
    release(); release(); expect(budget.size).toBe(1);
    expect(budget.acquire('a')).not.toBeNull();
  });
  it('rejects invalid production configuration', () => {
    expect(streamLimit(undefined, 2000)).toBe(2000);
    for (const value of ['0', '-1', 'no', '2.5', '100001']) expect(() => streamLimit(value, 1)).toThrow();
  });
});

it('disconnects slow or broken streams instead of buffering unlimited events', () => {
  const destroy = vi.fn();
  expect(writeStreamFrame({ destroyed: false, writableEnded: false, write: () => false, destroy }, 'event')).toBe('backpressure');
  expect(destroy).toHaveBeenCalledTimes(1);
  expect(writeStreamFrame({ destroyed: false, writableEnded: false, write: () => { throw new Error('pipe'); }, destroy }, 'event')).toBe('error');
  const write = vi.fn();
  expect(writeStreamFrame({ destroyed: true, writableEnded: false, write, destroy }, 'event')).toBe('closed');
  expect(write).not.toHaveBeenCalled();
});
