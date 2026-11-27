/**
 * Indian Mobile Number Validation & Normalization
 *
 * Rules:
 * 1. Must be provided (required).
 * 2. Formats supported:
 *    - 10 digits starting with 6, 7, 8, 9 (e.g. 9876543210)
 *    - With +91 prefix (e.g. +919876543210 or +91 98765 43210)
 *    - With 91 prefix (e.g. 919876543210)
 *    - With 0 prefix (e.g. 09876543210)
 * 3. Rejects short numbers (e.g. 987654), invalid prefixes, or alpha characters.
 * 4. Normalizes to E.164 standard: +91XXXXXXXXXX
 */
export interface PhoneValidationResult {
  isValid: boolean;
  normalized?: string;
  error?: string;
}

export function validateAndNormalizeIndianPhone(phone: string | null | undefined): PhoneValidationResult {
  if (!phone || !phone.trim()) {
    return {
      isValid: false,
      error: 'Mobile phone number is required.',
    };
  }

  // Strip all whitespace, hyphens, parentheses, and dots
  const cleaned = phone.trim().replace(/[\s\-.()]/g, '');

  let digits = cleaned;
  if (digits.startsWith('+91')) {
    digits = digits.slice(3);
  } else if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }

  // Must now be exactly 10 digits starting with 6, 7, 8, or 9
  if (!/^[6-9]\d{9}$/.test(digits)) {
    if (digits.length < 10) {
      return {
        isValid: false,
        error: 'Phone number is too short. Please enter a full 10-digit mobile number.',
      };
    }
    if (digits.length > 10) {
      return {
        isValid: false,
        error: 'Phone number is too long. Please enter a valid 10-digit mobile number.',
      };
    }
    return {
      isValid: false,
      error: 'Please enter a valid Indian mobile number starting with 6, 7, 8, or 9.',
    };
  }

  return {
    isValid: true,
    normalized: `+91${digits}`,
  };
}
