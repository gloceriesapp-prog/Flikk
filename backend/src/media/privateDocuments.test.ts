import { describe, it, expect, vi, beforeEach } from 'vitest';
const mocks = vi.hoisted(() => ({ insert: vi.fn(), update: vi.fn(), upload: vi.fn(), remove: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: {
  from: () => ({ insert: mocks.insert, update: (value: unknown) => ({ eq: () => mocks.update(value) }) }),
  storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove }) },
} }));
import { storePrivateDocument } from './privateDocuments.js';
const input = { bucket: 'rider-documents' as const, ownerId: '00000000-0000-4000-8000-000000000001', kind: 'aadhaar', bytes: Buffer.from([255,216,255,1]) };
beforeEach(() => { vi.clearAllMocks(); for (const fn of Object.values(mocks)) fn.mockResolvedValue({ error: null }); });
describe('private document storage', () => {
  it('returns only an owner-scoped path and asset ID, never a public URL', async () => {
    const document = await storePrivateDocument(input);
    expect(document).not.toHaveProperty('url');
    expect(document.path).toMatch(new RegExp(`^${input.ownerId}/aadhaar-.*\\.jpg$`));
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'private', public_url: null, provider: 'supabase' }));
    expect(mocks.upload).toHaveBeenCalledWith(document.path, input.bytes, { contentType: 'image/jpeg', upsert: false });
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
});
