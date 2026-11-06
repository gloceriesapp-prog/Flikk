import { pathToFileURL } from 'node:url';

const filters = {
  backend: 'backend',
  'commerce-security': 'sql',
  customer: 'customer',
  'mobile-apps': 'mobile',
  'web-apps': 'web',
};

export function verifyCiResults(event, needs) {
  if (!['push', 'pull_request'].includes(event)) throw new Error('Unsupported CI event');
  if (!needs || typeof needs !== 'object') throw new Error('Missing CI job results');
  const changes = needs.changes;
  if (event === 'pull_request' && changes?.result !== 'success') {
    throw new Error('Change detection did not succeed; skipped checks cannot approve this PR');
  }
  for (const [job, filter] of Object.entries(filters)) {
    const selected = changes?.outputs?.[filter];
    if (event === 'pull_request' && !['true', 'false'].includes(selected)) {
      throw new Error(`Missing or invalid change filter: ${filter}`);
    }
    const required = event === 'push' || selected === 'true';
    const result = needs[job]?.result;
    if (required ? result !== 'success' : !['success', 'skipped'].includes(result)) {
      throw new Error(`${job}: expected ${required ? 'success' : 'success or intentional skip'}, got ${result ?? 'missing'}`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    verifyCiResults(process.env.CI_EVENT, JSON.parse(process.env.CI_NEEDS ?? 'null'));
    console.log('All selected CI checks passed. Any skips match successful change detection.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
