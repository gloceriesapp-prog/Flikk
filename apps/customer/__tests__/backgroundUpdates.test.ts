import { createBackgroundUpdates } from '../src/features/app-updates/backgroundUpdates';

it('downloads an available update once and never reloads a checkout or tracking session', async () => {
  const driver = { check: jest.fn(async () => ({ isAvailable: true })), fetch: jest.fn(async () => ({})), reload: jest.fn() };
  const run = createBackgroundUpdates(driver, () => 1000);
  await run(() => true);
  await run(() => true);
  expect(driver.check).toHaveBeenCalledTimes(1);
  expect(driver.fetch).toHaveBeenCalledTimes(1);
  expect(driver.reload).not.toHaveBeenCalled();
});
it('does no network work offline or while backgrounded', async () => {
  const driver = { check: jest.fn(), fetch: jest.fn() };
  await createBackgroundUpdates(driver)(() => false);
  expect(driver.check).not.toHaveBeenCalled();
});
it('rechecks foreground/connectivity after the manifest request', async () => {
  let active = true;
  const driver = { check: jest.fn(async () => { active = false; return { isAvailable: true }; }), fetch: jest.fn() };
  await createBackgroundUpdates(driver)(() => active);
  expect(driver.fetch).not.toHaveBeenCalled();
});
it('coalesces concurrent foreground/network checks and retries failures only after cooldown', async () => {
  let now = 1000;
  let finish!: (value: { isAvailable: boolean }) => void;
  const driver = { check: jest.fn(() => new Promise<{ isAvailable: boolean }>(resolve => { finish = resolve; })), fetch: jest.fn(async () => { throw new Error('offline'); }) };
  const run = createBackgroundUpdates(driver, () => now);
  const first = run(() => true);
  await run(() => true);
  expect(driver.check).toHaveBeenCalledTimes(1);
  finish({ isAvailable: true }); await first;
  await run(() => true); expect(driver.check).toHaveBeenCalledTimes(1);
  now += 60_001;
  const retry = run(() => true); finish({ isAvailable: false }); await retry;
  expect(driver.check).toHaveBeenCalledTimes(2);
});
it('downloads rollback-to-embedded directives for the next cold launch without restarting', async () => {
  const driver = { check: jest.fn(async () => ({ isAvailable: false, isRollBackToEmbedded: true })), fetch: jest.fn(async () => ({ isRollBackToEmbedded: true })), reload: jest.fn() };
  await createBackgroundUpdates(driver)(() => true);
  expect(driver.fetch).toHaveBeenCalledTimes(1);
  expect(driver.reload).not.toHaveBeenCalled();
});
