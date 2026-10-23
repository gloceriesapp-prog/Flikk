// Copies every Supabase Storage file from Flikk (Seoul) to gloceries-mumbai,
// bucket by bucket, same path, same content type. Seoul is only read.
// Buckets themselves (public/private, size and MIME limits) arrive with the
// database copy (storage.buckets); any bucket still missing is created here
// with the same settings. Re-running is safe: files are uploaded with upsert.
//
// Run from the repo root after 1-copy-database.sh (keys: each project's
// Settings → API keys → service_role / secret; type them in your terminal,
// never into chat or a committed file):
//   export OLD_SUPABASE_URL=https://bjlknohjdnemxwwoxcsv.supabase.co OLD_SERVICE_KEY=...
//   export NEW_SUPABASE_URL=https://cdnfpaolzkpqetmmpyzh.supabase.co NEW_SERVICE_KEY=...
//   node backend/scripts/mumbai/2-copy-storage.mjs
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');

const env = (name) => {
  const value = process.env[name];
  if (!value) { console.error(`Set ${name} first.`); process.exit(1); }
  return value;
};
const oldUrl = env('OLD_SUPABASE_URL');
const newUrl = env('NEW_SUPABASE_URL');
if (!oldUrl.includes('bjlknohjdnemxwwoxcsv')) { console.error('OLD_SUPABASE_URL is not the Seoul project.'); process.exit(1); }
if (!newUrl.includes('cdnfpaolzkpqetmmpyzh')) { console.error('NEW_SUPABASE_URL is not gloceries-mumbai.'); process.exit(1); }

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const from = createClient(oldUrl, env('OLD_SERVICE_KEY'), options);
const to = createClient(newUrl, env('NEW_SERVICE_KEY'), options);

// All object paths in a bucket; folders are list entries without an id.
async function listAll(storage, bucket, prefix = '') {
  const files = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await storage.from(bucket).list(prefix, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) files.push(...await listAll(storage, bucket, path));
      else files.push({ path, contentType: entry.metadata?.mimetype, cacheControl: entry.metadata?.cacheControl });
    }
    if (data.length < 1000) return files;
  }
}

const { data: buckets, error: bucketError } = await from.storage.listBuckets();
if (bucketError) throw new Error(`listBuckets: ${bucketError.message}`);
const { data: existing } = await to.storage.listBuckets();
const existingIds = new Set((existing ?? []).map((b) => b.id));

let copied = 0;
let failed = 0;
const summary = [];
for (const bucket of buckets) {
  if (!existingIds.has(bucket.id)) {
    const { error } = await to.storage.createBucket(bucket.id, {
      public: bucket.public,
      fileSizeLimit: bucket.file_size_limit ?? undefined,
      allowedMimeTypes: bucket.allowed_mime_types ?? undefined,
    });
    if (error) throw new Error(`createBucket ${bucket.id}: ${error.message}`);
    console.log(`created bucket ${bucket.id} (public=${bucket.public})`);
  }
  const files = await listAll(from.storage, bucket.id);
  for (const file of files) {
    const { data: blob, error: downloadError } = await from.storage.from(bucket.id).download(file.path);
    if (downloadError) { failed += 1; console.error(`download ${bucket.id}/${file.path}: ${downloadError.message}`); continue; }
    const maxAge = /max-age=(\d+)/.exec(file.cacheControl ?? '')?.[1];
    const { error: uploadError } = await to.storage.from(bucket.id).upload(file.path, blob, {
      upsert: true,
      contentType: file.contentType || blob.type || 'application/octet-stream',
      ...(maxAge ? { cacheControl: maxAge } : {}),
    });
    if (uploadError) { failed += 1; console.error(`upload ${bucket.id}/${file.path}: ${uploadError.message}`); continue; }
    copied += 1;
  }
  const after = await listAll(to.storage, bucket.id);
  summary.push(`${bucket.id}: ${files.length} in Seoul, ${after.length} in Mumbai`);
}

console.log(summary.join('\n'));
console.log(`Copied ${copied} files, ${failed} failed.`);
if (failed > 0 || summary.some((line) => { const [, a, b] = line.match(/: (\d+) in Seoul, (\d+) in Mumbai/); return a !== b; })) {
  console.error('Storage copy is NOT complete; fix the errors above and run again (safe to repeat).');
  process.exit(1);
}
console.log('Storage copy verified: every bucket has the same file count.');
