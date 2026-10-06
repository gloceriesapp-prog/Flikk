# Media storage

Public image bytes live in Cloudflare R2 (`gloceries-public`). Supabase
retains the existing image URL fields plus a service-only `media_assets`
ledger: object key, provider, purpose, hash, size and upload state. Private
identity/verification documents remain in non-public Supabase buckets.
Public store photographs are different from private store documents.

## Configuration and rollout

1. Apply `094_media_storage_split.sql` before deploying the new upload routes
   or worker. It makes the sensitive buckets private and denies client access
   even if an older permissive storage policy exists.
2. Set the same server-only configuration in `backend/.env.local` and
   `apps/admin/.env.local` (production: secret manager). Templates are supplied:
   `R2_ACCOUNT_ID`, `R2_ENDPOINT`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE_URL`.
3. Create an R2 API token with object read/write limited to `gloceries-public`.
   Do not expose credentials in mobile apps or `NEXT_PUBLIC`/`EXPO_PUBLIC` vars.
   `R2_PUBLIC_BASE_URL` is the public image domain, not the S3 API endpoint.
   Connect a custom HTTPS domain to the bucket for production delivery.
4. Restart the backend, admin and dedicated background worker. Configuration
   is lazy: unconfigured public uploads fail with a clear 503 rather than
   silently storing public images in Supabase. Test one upload per purpose.
5. Copy legacy images in reviewed batches, verify delivery and then replace
   references. Keep the original files until all consumers have migrated.

## Folder routing

| Purpose | R2 prefix |
| --- | --- |
| App artwork / quick tiles | `appsui/` |
| Header and content banners | `banners/` |
| Category and subcategory artwork | `categories/` |
| Festival-specific artwork | `festivals/` |
| General illustrations | `illustrations/` |
| Product photographs | `products/<store-id>/` on partner uploads |
| Public shop photographs | `stores/` |

The admin Media Library supports all seven purposes; existing product, store
and category upload controls map to their respective folders automatically.
Home content editors now include banner and item upload controls. Folder
names are validated on the server. R2 folders are object-key prefixes; there
is no need to create directories on every upload.

## Upload consistency and recovery

The upload pipeline authenticates callers, bounds input bytes/pixels, strips
image metadata, preserves transparency and normalizes public images to WebP.
Keys are unique per upload; a replacement gets a new immutable URL and does
not overwrite a CDN-cached object. Private documents normalize to JPEG.

A pending ledger row is committed before any object PUT. A URL/path is only
returned after the public URL passes an HTTPS image check and the ready state is saved.
A DNS failure or inaccessible R2 domain prevents saving a broken public URL. Failure deletes the new object or
retains a cleanup intent. Dedicated workers claim stale/failed uploads in
bounded, fenced batches with `SKIP LOCKED`; a one-hour grace protects active
uploads. Failed removals retry after backoff. Ready assets are never swept
because they may already be attached to a content record. Replacing an image
does not eagerly delete an older image that another record may still use.

Signed private document URLs are generated only by authorized server routes.
`GET /api/media/private/:assetId` requires an administrator and returns a
five-minute, non-cacheable URL; clients cannot choose arbitrary storage paths.
Existing rider approval reads remain compatible with older private files.
`POST /partner/store-document-photo` accepts supported verification kinds
and returns only a private path and asset ID; the caller must retain that
reference in its application workflow. Sensitive text/KYC fields remain in
Supabase and never enter the public image ledger or bucket.

## Legacy migration

Build backend first. Prepare a JSON manifest containing public image sources:

```json
[
  {"sourceUrl":"https://PROJECT.supabase.co/storage/v1/object/public/Images/art.png","folder":"appsui"},
  {"sourceUrl":"https://PROJECT.supabase.co/storage/v1/object/public/product-images/photo.webp","folder":"products","target":{"table":"products","id":"PRODUCT_UUID","column":"image_url"}}
]
```

From `backend`:

```sh
node --env-file=.env.local scripts/migrate-public-media.mjs manifest.json
node --env-file=.env.local scripts/migrate-public-media.mjs manifest.json --apply
```

Dry-run validates the plan without network or database writes. Apply only
accepts public image URLs from this Supabase project, forbids redirects,
bounds downloads and image processing, journals copies before updating
references, checks public delivery and compares the old URL before writing.
Targets are explicitly allowlisted. App source constants and nested content
JSON require reviewing and applying the resulting mapping separately.
The script does not migrate documents or delete legacy objects. Review the
journal before retrying a partial run to avoid redundant copies.

## Verification

`node --test packages/server-media/upload.test.cjs` verifies folder isolation,
configuration, ordering and upload compensation. The disposable PostgreSQL
fixture runs `backend/tests/sql/media-storage.sql` to verify privacy even
with permissive old policies, legacy readability and cleanup lease fencing.
Actual R2/CDN integration requires the configured public domain and token.

## Customer and partner image display

Both apps render public photos using `expo-image` with memory/disk caching,
WebP support and a URL-derived recycling key. A new immutable URL resets the
view instead of briefly displaying the previous product's cached photo.
No bucket credentials or storage API endpoints are sent to the apps. Existing
Supabase public URLs remain compatible during migration.

Partner product-detail and order-detail images use the actual product/item
URL. Catalog and store/order data refresh on screen focus without adding a
background polling loop. The partner TypeScript config resolves React Native
to the app's SDK version (with a hoisted fallback), so NativeWind augmentation
uses the same React Native types as the screens in this npm workspace.

Restart Expo after dependency changes. Expo Go includes expo-image; a custom
partner development build must be rebuilt after adding this native module.
The image domain must resolve on the physical phone as well as the computer.

### Customer public-image recovery

Customer `AppImage` uses the libwebp decoder on iOS and remounts its native
view when the image URL changes. Direct Cloudflare delivery remains primary.
On a native load failure, immutable uploads from `images.gloceries.com` retry
once through `GET /media/public/:folder/:file`, using the same R2 object.
The fallback stops on failure and preserves caller error handlers. It does
not clear the global device cache or copy public images into Supabase.

The backend uses its server-only R2 credentials and fixed public bucket;
only seven public folder names and UUID WebP filenames are accepted. No
caller-supplied host, bucket, signed URL or private document key is accepted.
Reads stream without database queries or image transformations, have a
15-second timeout, a 10 MiB size ceiling and 24 concurrent streams per
instance, and abort on client disconnect. Responses support immutable HTTP
and device caching. Normal direct CDN loads incur no backend media request.
If CDN recovery becomes frequent, investigate device DNS/TLS and Cloudflare
rules rather than sizing the API as the primary image CDN.

Deploy the backend route before the customer update. Local tsx watch picks
up the route; reload Expo to load the component change. No migration or
new credential is required when R2 uploads are already configured.
