// Saved Indian numbers may include +91, separators or a leading zero.
// Invalid/incomplete numbers never expose a partially masked contact.
export function maskRecipientPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  const national = digits.length === 12 && digits.startsWith('91')
    ? digits.slice(2)
    : digits.length === 11 && digits.startsWith('0') ? digits.slice(1) : digits;
  if (national.length !== 10) return null;
  return `${national.slice(0, 5)}XXXXX`;
}
