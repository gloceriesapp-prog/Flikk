// Editorial discovery terms, not a claim about measured popularity.
export const DISCOVERY_GROUPS = [
  /\b(kashaya|kokum|nannari|sharbat|sherbet)\b/i,
  /\b(chutney pudi|chutney podi|chutney powder|puliyogare mix)\b/i,
  /\b(kodubale|chakkuli|murukku|jackfruit chips)\b/i,
  /\b(thokku|uppinakayi)\b/i,
  /\b(mysore pak|chikki|payasam)\b/i,
];

export function productExplanation(description: string | null): string {
  return (description ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}
