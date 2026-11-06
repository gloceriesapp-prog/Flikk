import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyCiResults } from './ci-gate.mjs';

function jobs() {
  return {
    changes: { result: 'success', outputs: { backend: 'true', sql: 'false', customer: 'false', mobile: 'false', web: 'true' } },
    backend: { result: 'success' },
    'commerce-security': { result: 'skipped' },
    customer: { result: 'skipped' },
    'mobile-apps': { result: 'skipped' },
    'web-apps': { result: 'success' },
  };
}

test('allows intentional skips only after successful PR filtering', () => {
  assert.doesNotThrow(() => verifyCiResults('pull_request', jobs()));
});
test('requires the entire suite on main even though change detection is skipped', () => {
  const needs = jobs();
  assert.throws(() => verifyCiResults('push', needs), /commerce-security/);
  for (const job of Object.values(needs)) job.result = 'success';
  needs.changes.result = 'skipped';
  assert.doesNotThrow(() => verifyCiResults('push', needs));
});
test('rejects failed, cancelled or skipped change detection', () => {
  for (const result of ['failure', 'cancelled', 'skipped']) {
    const needs = jobs();
    needs.changes.result = result;
    assert.throws(() => verifyCiResults('pull_request', needs), /Change detection/);
  }
});
test('rejects unexpected skips, failures and cancelled required jobs', () => {
  for (const result of ['skipped', 'failure', 'cancelled', undefined]) {
    const needs = jobs();
    needs.backend.result = result;
    assert.throws(() => verifyCiResults('pull_request', needs), /backend/);
  }
});
test('rejects failed matrix aggregation even if that area was not selected', () => {
  const needs = jobs();
  needs['mobile-apps'].result = 'failure';
  assert.throws(() => verifyCiResults('pull_request', needs), /mobile-apps/);
});
test('rejects missing or malformed filter output rather than silently skipping', () => {
  for (const value of [undefined, '', true, 'TRUE']) {
    const needs = jobs();
    needs.changes.outputs.sql = value;
    assert.throws(() => verifyCiResults('pull_request', needs), /sql/);
  }
  assert.throws(() => verifyCiResults('workflow_dispatch', jobs()), /Unsupported/);
  assert.throws(() => verifyCiResults('pull_request', null), /Missing CI/);
});
