'use strict';
const { MediaError } = require('./policy.cjs');
// Verify the delivery domain, not just the S3 PUT. A successful private API
// write does not mean browsers can retrieve the image from the public URL.
async function verifyPublicImage(url, request = fetch) {
  let response;
  try {
    response = await request(url, { method: 'HEAD', redirect: 'error', signal: AbortSignal.timeout(8000) });
  } catch {
    throw new MediaError('MEDIA_DELIVERY_UNAVAILABLE', 'The R2 public image domain is unreachable. Connect the domain or configure the enabled R2 public URL.');
  }
  if (!response.ok || !response.headers.get('content-type')?.toLowerCase().startsWith('image/webp'))
    throw new MediaError('MEDIA_DELIVERY_UNAVAILABLE', 'The image is not publicly accessible. Check the R2 public domain and bucket access settings.');
}
module.exports = { verifyPublicImage };
