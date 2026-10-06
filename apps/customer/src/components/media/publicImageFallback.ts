// Only immutable public uploads may use the API recovery path. Signed/private
// URLs and third-party URLs must never be forwarded to a media endpoint.
export function publicImageFallback(uri: string | undefined, apiBaseUrl: string): string | undefined {
  if (!uri) return;
  try {
    const url = new URL(uri);
    if (url.protocol !== 'https:' || url.hostname !== 'images.gloceries.com' ||
        url.username || url.password || url.search || url.hash) return;
    if (!/^\/(?:appsui|banners|categories|festivals|illustrations|products|stores)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/i.test(url.pathname)) return;
    return `${apiBaseUrl}/media/public${url.pathname}`;
  } catch { return; }
}
