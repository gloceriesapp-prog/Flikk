// Only a short prefix and the actual domain may leave the server.
export function maskEmail(email: string): string {
  const match = /^([^\s@]+)@([^\s@]+\.[^\s@]+)$/.exec(email.trim());
  if (!match) return '••••';
  const [, name, domain] = match;
  return `${name.slice(0, Math.min(2, Math.max(0, name.length - 1)))}••••@${domain}`;
}
