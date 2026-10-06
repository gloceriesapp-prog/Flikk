// Canonical identity is the complete filename, including duplicate legacy prefixes.
// Read-only by design: never invent a remote applied ledger from local files.
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
const directory = new URL('../migrations/', import.meta.url);
const registry = new URL('../migrations/manifest.json', import.meta.url);
const files = (await readdir(directory)).filter(name => /^\d+_.+\.sql$/.test(name)).sort();
// Historical files 007+ depend on untracked schema recovered by 091.
const baselineIndex = files.indexOf('091_legacy_schema_prerequisites.sql');
if (baselineIndex < 0 || !files.includes('007_draft_owner_shop_license.sql')) throw new Error('Missing canonical legacy prerequisites');
const baseline = files.splice(baselineIndex, 1)[0];
files.splice(files.indexOf('007_draft_owner_shop_license.sql'), 0, baseline);
const migrations = await Promise.all(files.map(async file => ({
  file, sha256: createHash('sha256').update(await readFile(new URL(file, directory))).digest('hex'),
})));
if (process.argv[2] === '--write') {
  await writeFile(registry, JSON.stringify({ version: 1, migrations }, null, 2) + '\n');
} else {
  const expected = JSON.parse(await readFile(registry, 'utf8'));
  if (JSON.stringify(expected.migrations) !== JSON.stringify(migrations)) {
    throw new Error('Migration registry mismatch. Review SQL changes and explicitly regenerate the manifest.');
  }
  console.log(`Verified ${migrations.length} migration identities and SHA-256 checksums.`);
}
