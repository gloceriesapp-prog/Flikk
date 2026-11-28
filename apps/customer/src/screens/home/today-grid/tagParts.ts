// Splits a card tag into the pill's quiet lead and bold value:
// "Up to 33% off" -> Up to | 33% OFF, "From ₹20" -> From | ₹20,
// "Landed 6:40 AM" -> Landed | 6:40 AM. Anything else is all value.
const LEADS = [/^(up\s*to)\s+(.+)$/i, /^(from|starting\s+(?:from|at))\s+(.+)$/i, /^(landed)\s+(.+)$/i, /^(order\s+by)\s+(.+)$/i, /^(picked)\s+(.+)$/i];

export function tagParts(tag: string): { lead: string | null; value: string } {
  const text = tag.trim().replace(/\s+/g, ' ');
  for (const pattern of LEADS) {
    const match = pattern.exec(text);
    if (match) {
      const lead = match[1]!.replace(/\s+/g, ' ');
      return { lead: lead[0]!.toUpperCase() + lead.slice(1).toLowerCase(), value: match[2]!.replace(/%\s*off\b/i, '% OFF') };
    }
  }
  return { lead: null, value: text.replace(/%\s*off\b/i, '% OFF') };
}
