// Older onboarding rows stored display labels; time inputs require HH:mm.
export function editableStoreTime(value: string): string {
  const text = value.trim();
  const clock = text.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (clock) return `${clock[1].padStart(2, '0')}:${clock[2]}`;
  const legacy = text.match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s*(am|pm)$/i);
  if (!legacy) return text;
  const hour = Number(legacy[1]) % 12 + (legacy[3].toLowerCase() === 'pm' ? 12 : 0);
  return `${String(hour).padStart(2, '0')}:${legacy[2]}`;
}
