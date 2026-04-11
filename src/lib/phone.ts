/**
 * Validates and normalises Kenyan phone numbers.
 *
 * Accepted formats:
 *   07XXXXXXXX   - Safaricom (070, 071, 072, 074, 075, 079), Airtel (073, 075), Telkom (077)
 *   0110/0111XX  - Safaricom
 *   0100/0101XX  - Airtel
 *   01XXXXXXXX   - all other 01X operators
 *   +2547XXXXXXXX / 2547XXXXXXXX - international
 *   +2541XXXXXXXX / 2541XXXXXXXX - international
 */

const KE_REGEX = /^(?:\+?254|0)(7\d{8}|1\d{8})$/;

export const isValidKenyanPhone = (value: string): boolean => {
  return KE_REGEX.test(value.replace(/\s+/g, ''));
};

/** Normalise to +254XXXXXXXXX */
export const normaliseKenyanPhone = (value: string): string => {
  const stripped = value.replace(/\s+/g, '');
  if (stripped.startsWith('+254')) return stripped;
  if (stripped.startsWith('254')) return '+' + stripped;
  if (stripped.startsWith('0')) return '+254' + stripped.slice(1);
  return stripped;
};

export const phoneErrorMessage =
  'Enter a valid Kenyan number: 07XXXXXXXX, 0110XXXXXX, 0111XXXXXX, or +254XXXXXXXXX';
