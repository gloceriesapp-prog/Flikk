// {placeholder} parsing shared by the renderer and the validator.
import type { Placeholder } from './types.js';

export const ALL_PLACEHOLDERS: Placeholder[] = ['min', 'pct', 'total', 'time', 'cutoff', 'festival'];
export function placeholdersIn(template: string): string[] {
  return [...template.matchAll(/\{([^{}]*)\}/g)].map(match => match[1] ?? '');
}
// Fill {name} from values; null when any needed value is missing.
export function fill(template: string, values: Partial<Record<Placeholder, string | null>>): string | null {
  let missing = false;
  const out = template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key as Placeholder];
    if (value == null || value === '') { missing = true; return ''; }
    return value;
  });
  return missing ? null : out;
}
