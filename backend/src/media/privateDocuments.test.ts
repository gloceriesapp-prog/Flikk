import { describe, it, expect, vi, beforeEach } from 'vitest';
const mocks = vi.hoisted(() => ({ insert: vi.fn(), update: vi.fn(), upload: vi.fn(), remove: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: {
  from: () => ({ insert: mocks.insert, update: (value: unknown) => ({ eq: () => mocks.update(value) }) }),
  storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove }) },
} }));
import { storePrivateDocument } from './privateDocuments.js';
// 'profile' is now an ENCRYPTED kind (partner owner photo joined the KYC set),
// so the shared fixture exercises the encrypted path. The plaintext branch
// survives only for legacy/unlisted kinds; encryption is covered here and by
// packages/server-media/encryption.test.cjs.
const input = { bucket: 'store-documents' as const, ownerId: '00000000-0000-4000-8000-000000000001', kind: 'profile', bytes: Buffer.from([255,216,255,1]) };
beforeEach(() => { process.env.DOC_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64'); vi.clearAllMocks(); for (const fn of Object.values(mocks)) fn.mockResolvedValue({ error: null }); });
describe('private document storage', () => {
  it('encrypts the owner profile kind: ciphertext path, encrypted row, never a public URL', async () => {
    const document = await storePrivateDocument(input);
    expect(document).not.toHaveProperty('url');
    expect(document.path).toMatch(new RegExp(`^${input.ownerId}/profile-.*\\.enc$`));
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'private', public_url: null, provider: 'supabase', encrypted: true }));
    const [, uploadedBytes, uploadOpts] = mocks.upload.mock.calls[0];
    expect(uploadOpts).toMatchObject({ contentType: 'application/octet-stream' });
    expect(Buffer.from(uploadedBytes).equals(input.bytes)).toBe(false);
  });
  it('does not write object bytes if the durable intent fails', async () => {
    mocks.insert.mockResolvedValue({ error: {} });
    await expect(storePrivateDocument(input)).rejects.toMatchObject({ code: 'MEDIA_METADATA_FAILED' });
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it('retains cleanup intent when storage deletion fails', async () => {
    mocks.upload.mockResolvedValue({ error: {} }); mocks.remove.mockResolvedValue({ error: {} });
    await expect(storePrivateDocument(input)).rejects.toMatchObject({ code: 'DOCUMENT_UPLOAD_FAILED' });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed', cleanup_pending: true }));
  });
  it('rejects invalid owner paths and invalid image bytes before database work', async () => {
    await expect(storePrivateDocument({ ...input, kind: '../secret' })).rejects.toMatchObject({ code: 'INVALID_DOCUMENT' });
    await expect(storePrivateDocument({ ...input, bytes: Buffer.from('no') })).rejects.toMatchObject({ code: 'INVALID_DOCUMENT' });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it('fails closed on a KYC kind when encryption is not configured', async () => {
    delete process.env.DOC_ENCRYPTION_KEY;
    await expect(storePrivateDocument({ ...input, kind: 'aadhaar' })).rejects.toMatchObject({ code: 'ENCRYPTION_NOT_CONFIGURED' });
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it('encrypts KYC kinds: ciphertext upload, .enc key, encrypted row', async () => {
    process.env.DOC_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
    try {
      const document = await storePrivateDocument({ ...input, kind: 'aadhaar' });
      expect(document.path).toMatch(new RegExp(`^${input.ownerId}/aadhaar-.*\\.enc$`));
      expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
        encrypted: true, content_type: 'image/jpeg', byte_size: input.bytes.length,
        enc_algo: 'AES-256-GCM', enc_iv: expect.any(String), wrapped_dek: expect.any(String), kek_id: 'v1',
      }));
      const [, uploadedBytes, uploadOpts] = mocks.upload.mock.calls[0];
      expect(uploadOpts).toMatchObject({ contentType: 'application/octet-stream' });
      expect(Buffer.from(uploadedBytes).equals(input.bytes)).toBe(false);
    } finally {
      delete process.env.DOC_ENCRYPTION_KEY;
    }
  });
});
