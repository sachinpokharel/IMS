// Nepal phone utilities

export function formatPhoneWithCountryCode(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '').replace(/^0+/, '');
  const withoutCountryCode = cleaned.replace(/^\+977/, '');
  const lastTenDigits = withoutCountryCode.slice(-10);
  return '+977' + lastTenDigits;
}

export function validateNepalPhone(phone: string): { valid: boolean; error?: string } {
  const cleaned = phone.replace(/\s+/g, '');
  const digitsOnly = cleaned.replace(/\D/g, '');
  
  if (digitsOnly.length !== 10) {
    return {
      valid: false,
      error: 'Phone number must be exactly 10 digits',
    };
  }

  // Accept patterns:
  // 9841234567 (10 digits)
  // +9779841234567 (with +977)
  // 09841234567 (with leading 0)
  const patterns = [
    /^\d{10}$/, // 9841234567
    /^\+977\d{10}$/, // +9779841234567
    /^0\d{9}$/, // 09841234567
  ];

  const isValid = patterns.some((pattern) => pattern.test(cleaned));

  if (!isValid) {
    return {
      valid: false,
      error: 'Invalid Nepal phone format',
    };
  }

  return { valid: true };
}
