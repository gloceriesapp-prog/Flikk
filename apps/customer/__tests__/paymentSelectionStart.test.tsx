import { renderHook } from '@testing-library/react-native';
import { usePaymentSelectionStart } from '../src/screens/cart/payment/usePaymentSelectionStart';

it('consumes a chooser tap before starting and never repeats it on rerender or focus change', async () => {
  const calls: string[] = [];
  const start = jest.fn(() => { calls.push('start'); });
  const input = { requested: true, active: true, ready: true, eligible: true,
    consume: () => { calls.push('consume'); }, start, invalid: jest.fn() };
  const view = await renderHook((props: typeof input) => usePaymentSelectionStart(props), { initialProps: input });
  await view.rerender({ ...input, start: jest.fn(() => start()) });
  await view.rerender({ ...input, active: false });
  await view.rerender(input);
  expect(calls).toEqual(['consume', 'start']);
});

it('waits for validation and only starts a new checkout after a new explicit chooser action', async () => {
  const start = jest.fn();
  const input = { requested: true, active: true, ready: false, eligible: true, consume: jest.fn(), start, invalid: jest.fn() };
  const view = await renderHook((props: typeof input) => usePaymentSelectionStart(props), { initialProps: input });
  expect(start).not.toHaveBeenCalled();
  await view.rerender({ ...input, ready: true });
  await view.rerender({ ...input, requested: false, ready: true });
  await view.rerender({ ...input, ready: true });
  expect(start).toHaveBeenCalledTimes(2);
});

it('consumes an ineligible request without charging, even if the cart later becomes eligible', async () => {
  const input = { requested: true, active: true, ready: true, eligible: false,
    consume: jest.fn(), start: jest.fn(), invalid: jest.fn() };
  const view = await renderHook((props: typeof input) => usePaymentSelectionStart(props), { initialProps: input });
  await view.rerender({ ...input, eligible: true });
  expect(input.consume).toHaveBeenCalledTimes(1);
  expect(input.invalid).toHaveBeenCalledTimes(1);
  expect(input.start).not.toHaveBeenCalled();
});
