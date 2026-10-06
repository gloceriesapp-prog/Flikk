export class UploadBodyTooLarge extends Error {}
// Count actual streamed bytes, including chunked requests, before form parsing.
export async function boundedForm(request: Request, maxBytes: number): Promise<FormData> {
  const size = request.headers.get('content-length');
  if (size && (!/^\d+$/.test(size) || Number(size) > maxBytes)) throw new UploadBodyTooLarge();
  if (!request.body) throw new Error('No upload content.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) { await reader.cancel(); throw new UploadBodyTooLarge(); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const combined = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.byteLength; }
  return new Response(combined, { headers: { 'Content-Type': request.headers.get('content-type') ?? '' } }).formData();
}
