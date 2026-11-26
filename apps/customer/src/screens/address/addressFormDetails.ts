// New addresses store building + map area in line1. Remove only an exact
// known suffix on edit, so repeated saves never duplicate the locality.
export function buildingFromSavedAddress(line1: string, area: string): string {
  const saved = line1.trim();
  const suffix = area.trim() ? `, ${area.trim()}` : '';
  return suffix && saved.endsWith(suffix) ? saved.slice(0, -suffix.length) : saved;
}
