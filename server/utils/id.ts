/**
 * Generate a unique ID with optional prefix
 * For customers, invoices, etc: uses sequential numbering (CUST001, INV001, etc)
 * For other types: uses UUID
 */
export function generateId(prefix?: string): string {
  if (!prefix) {
    return crypto.randomUUID();
  }

  // Sequential IDs for specific entity types
  const sequentialTypes = ['CUST', 'INV', 'PAY'];
  
  if (sequentialTypes.includes(prefix)) {
    // Generate sequential ID with timestamp for uniqueness
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const number = ((timestamp % 1000000) * 1000 + random) % 1000000;
    const paddedNumber = String(number).padStart(6, '0');
    return `${prefix}${paddedNumber}`;
  }

  // For other prefixes, use UUID format
  const uuid = crypto.randomUUID();
  return `${prefix}_${uuid}`;
}
