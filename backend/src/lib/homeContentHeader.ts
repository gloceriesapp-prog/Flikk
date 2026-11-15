/** New artwork stays outside the version-1 content document on the public API.
 * Older installed clients reject unknown document fields, but tolerate record metadata. */
export function publicHomeHeader(value: unknown): { content: unknown; headerImageUrl?: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { content: value };
  const { headerImageUrl, ...content } = value as Record<string, unknown>;
  return { content, ...(typeof headerImageUrl === 'string' && headerImageUrl ? { headerImageUrl } : {}) };
}
