import { act, renderHook } from '@testing-library/react-native';
import { useOtpChallenge } from '../../../packages/shared/src/auth/useOtpChallenge';

describe('OTP challenge lifecycle shared by all mobile apps', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-09T09:00:00Z'));
  });
  afterEach(() => jest.useRealTimers());

  it('combines auto-submit and a same-frame button tap into one verification', async () => {
    const { result } = await renderHook(() => useOtpChallenge());
    let resolve!: () => void;
    const request = new Promise<void>((done) => { resolve = done; });
    const verify = jest.fn(async () => { await request; });
    let first!: Promise<void>;
    await act(() => {
      first = result.current.run(verify);
      void result.current.run(verify);
    });
    expect(verify).toHaveBeenCalledTimes(1);
    expect(result.current.busy).toBe(true);
    await act(async () => { resolve(); await first; });
    expect(result.current.busy).toBe(false);
    await act(async () => { await result.current.run(verify); });
    expect(verify).toHaveBeenCalledTimes(2);
  });

  it('catches up to wall-clock time after background suspension', async () => {
    const { result } = await renderHook(() => useOtpChallenge());
    expect(result.current.secondsLeft).toBe(60);
    expect(result.current.canResend()).toBe(false);
    jest.setSystemTime(new Date('2026-10-09T09:02:00Z'));
    await act(() => { jest.advanceTimersByTime(500); });
    expect(result.current.secondsLeft).toBe(0);
    expect(result.current.canResend()).toBe(true);
    await act(() => { result.current.restartCooldown(); });
    expect(result.current.secondsLeft).toBe(60);
    expect(result.current.canResend()).toBe(false);
  });

  it('does not accept a late verification after leaving the OTP screen', async () => {
    const { result, unmount } = await renderHook(() => useOtpChallenge());
    let resolve!: () => void;
    const response = new Promise<void>((done) => { resolve = done; });
    const acceptSession = jest.fn();
    let first!: Promise<void>;
    await act(() => {
      first = result.current.run(async (isCurrent) => {
        await response;
        if (isCurrent()) acceptSession();
      });
    });
    await unmount();
    await act(async () => { resolve(); await first; });
    expect(acceptSession).not.toHaveBeenCalled();
  });

  it('releases the request guard after a rejected network operation', async () => {
    const { result } = await renderHook(() => useOtpChallenge(false));
    expect(result.current.canResend()).toBe(true);
    await act(async () => {
      await expect(result.current.run(async () => { throw new Error('offline'); })).rejects.toThrow('offline');
    });
    const retry = jest.fn(async () => undefined);
    await act(async () => { await result.current.run(retry); });
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
