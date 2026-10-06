// Explicit, bounded migration plan. Dry-run is the default; no legacy object
// is deleted. Run from backend after build with --env-file=.env.local.
import { readFile, appendFile } from 'node:fs/promises';
import { publicFolder, r2Config } from '../../packages/server-media/policy.cjs';
const args = process.argv.slice(2);
const manifestPath = args.find(value => !value.startsWith('--'));
if (!manifestPath) throw new Error('Provide a JSON manifest path; use --apply only after reviewing the dry-run.');
const apply = args.includes('--apply');
const rows = JSON.parse(await readFile(manifestPath, 'utf8'));
if (!Array.isArray(rows) || rows.length > 1000) throw new Error('Use batches of at most 1000 public assets.');
const allowed = { products: ['image_url', 'pending_image_url'], stores: ['photo_url'], categories: ['image_url'], seasonal_tiles: ['image_url'], seasonal_banner: ['banner_image_url'] };
const legacyBuckets = ['Images', 'product-images', 'store-images', 'category-images', 'home-tab-images', 'home-tab-banner-images'];
const origin = new URL(process.env.SUPABASE_URL).origin;
for (const row of rows) {
  publicFolder(row.folder);
  const source = new URL(row.sourceUrl);
  if (source.origin !== origin || source.search || source.hash || source.username || source.password ||
      !legacyBuckets.some(bucket => source.pathname.startsWith(`/storage/v1/object/public/${bucket}/`)))
    throw new Error('Manifest must contain only public image URLs from the configured Supabase project.');
  if (row.target && (!allowed[row.target.table]?.includes(row.target.column) || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(row.target.id)))
    throw new Error('Invalid database target. Use mapping-only mode for app artwork and nested content.');
}
if (!apply) { console.log(`Validated ${rows.length} public image references. No uploads or database writes performed.`); process.exit(0); }
r2Config(process.env);
const [{ storePublicImage }, { supabase, closeDatabaseConnections }, { default: sharp }] = await Promise.all([
  import('../dist/media/publicImages.js'), import('../dist/db/supabase.js'), import('sharp'),
]);
const output = `${manifestPath}.results.jsonl`;
try {
  for (const row of rows) {
    const response = await fetch(row.sourceUrl, { redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!response.ok || !response.body || !/^image\/(jpeg|png|webp)/i.test(response.headers.get('content-type') ?? '')) throw new Error('Public source image unavailable.');
    const chunks = []; let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > 5 * 1024 * 1024) throw new Error('Source image exceeds the migration size limit.');
      chunks.push(chunk);
    }
    const dimension = ['appsui', 'banners', 'festivals', 'illustrations'].includes(row.folder) ? 2048 : 800;
    const bytes = await sharp(Buffer.concat(chunks), { limitInputPixels: 20_000_000, animated: false }).timeout({ seconds: 8 }).rotate()
      .resize(dimension, dimension, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    const asset = await storePublicImage({ folder: row.folder, bytes });
    // Record successful copies before any reference update. This journal is
    // the reviewable mapping for hardcoded app artwork / nested JSON fields.
    await appendFile(output, `${JSON.stringify({ sourceUrl: row.sourceUrl, ...asset, target: row.target ?? null })}\n`, { mode: 0o600 });
    const delivered = await fetch(asset.url, { method: 'HEAD', redirect: 'error', signal: AbortSignal.timeout(10000) });
    if (!delivered.ok || !delivered.headers.get('content-type')?.startsWith('image/')) throw new Error('R2 public delivery verification failed; legacy reference retained.');
    if (row.target) {
      const { table, id, column } = row.target;
      const changed = await supabase.from(table).update({ [column]: asset.url }).eq('id', id).eq(column, row.sourceUrl).select('id');
      if (changed.error || changed.data?.length !== 1) throw new Error('Reference changed during migration; inspect results journal before retrying.');
    }
  }
  console.log(`Copied ${rows.length} public images. Verified mappings recorded in ${output}. Legacy files retained.`);
} finally { await closeDatabaseConnections(); }
