BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
-- KYC document envelope encryption (Phase 1). Sensitive rider/store KYC
-- documents are now AES-256-GCM encrypted at the application layer before
-- upload: a random per-document DEK encrypts the bytes, and that DEK is
-- wrapped by a KEK held only in backend/admin env (DOC_ENCRYPTION_KEY).
-- These columns persist the envelope metadata as base64 TEXT; the ciphertext
-- itself is stored in Storage as application/octet-stream bytes. All columns
-- are nullable and encrypted defaults false, so plaintext kinds (e.g. the
-- rider avatar 'profile') and every pre-existing row stay encrypted=false
-- with the envelope columns NULL. content_type keeps the ORIGINAL mime
-- (image/jpeg) so readers know how to serve the decrypted bytes.
ALTER TABLE public.media_assets
 ADD COLUMN IF NOT EXISTS encrypted boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS enc_algo text,
 ADD COLUMN IF NOT EXISTS enc_iv text,
 ADD COLUMN IF NOT EXISTS enc_tag text,
 ADD COLUMN IF NOT EXISTS wrapped_dek text,
 ADD COLUMN IF NOT EXISTS wrap_iv text,
 ADD COLUMN IF NOT EXISTS wrap_tag text,
 ADD COLUMN IF NOT EXISTS kek_id text;
-- Ciphertext uploads carry no image mime, so the private buckets must accept
-- application/octet-stream alongside the image/pdf types migration 094 set.
-- array_append + guard preserves the existing jpeg/png/webp(/pdf) entries and
-- is idempotent.
UPDATE storage.buckets
 SET allowed_mime_types = array_append(allowed_mime_types, 'application/octet-stream')
 WHERE id IN ('rider-documents','store-documents')
  AND NOT ('application/octet-stream' = ANY(allowed_mime_types));
-- Deliberately NO per-user path-prefix storage.objects RLS policy here:
-- clients never hold a Supabase storage token, every document read/write goes
-- through the service-role backend, and migration 094 already restricts
-- anon/authenticated out of these buckets entirely. A path-prefix policy would
-- be dead code.
COMMIT;
