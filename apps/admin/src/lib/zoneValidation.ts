// Zone create/edit input (admin Zones page → app/api/zones). zones.slug is
// NOT NULL UNIQUE (001_init.sql); it is derived from the name on create and
// kept stable afterwards so anything keyed by it does not move.

export class ZoneInputError extends Error {}

export function parseZoneName(value: unknown): string {
  if (typeof value !== 'string') throw new ZoneInputError('Zone name is required.');
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 80) throw new ZoneInputError('Zone name must be 2–80 characters.');
  return name;
}

export function zoneSlug(name: string): string {
  const slug = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  if (!slug) throw new ZoneInputError('Zone name needs at least one letter or number.');
  return slug;
}

export function parseZoneActive(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw new ZoneInputError('isActive must be true or false.');
  return value;
}
