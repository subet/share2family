// Characters that are unambiguous when read aloud or typed manually
// Excludes: 0/O (zero vs letter O), 1/I/L (one vs I vs L)
export const INVITE_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 6;
export const INVITE_CODE_EXPIRY_DAYS = 7;

export function formatInviteCode(code: string): string {
  const clean = code.replace(/[^A-Z0-9]/g, '').toUpperCase();
  if (clean.length <= 3) return clean;
  return `${clean.slice(0, 3)}-${clean.slice(3, 6)}`;
}

export function parseInviteCode(formatted: string): string {
  return formatted.replace(/[^A-Z0-9]/g, '').toUpperCase();
}
