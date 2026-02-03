import { customers } from '~~/server/database/schema';
import { generateId } from '~~/server/utils/id';
import { formatPhoneWithCountryCode, validateNepalPhone } from '~~/server/utils/phone';

// Nepal phone format validation - enforces max 10 digits
function validateNepalPhoneLocal(phone: string): { valid: boolean; error?: string } {
  const cleaned = phone.replace(/\s+/g, '');
  
  // Check length - only 10 digits allowed
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
      error: 'Invalid Nepal phone format. Use 10 digits, or prefix with +977/0',
    };
  }

  return { valid: true };
}

// Format phone number to +977 standard format
function formatPhoneWithCountryCodeLocal(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '').replace(/^0+/, '');
  
  // Remove +977 prefix if present to normalize
  const withoutCountryCode = cleaned.replace(/^\+977/, '');
  
  // Extract last 10 digits
  const lastTenDigits = withoutCountryCode.slice(-10);
  
  // Return with +977 prefix
  return '+977' + lastTenDigits;
}

export default defineEventHandler(async (event) => {
  const db = useDB();
  const body = await readBody<{
    name: string;
    phone: string;
    secondaryPhone?: string;
    street?: string;
    address?: string;
    district?: string;
  }>(event);

  // Validate required fields
  if (!body.name || !body.name.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Customer name is required',
    });
  }

  if (!body.phone || !body.phone.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Phone number is required',
    });
  }

  // Validate primary phone format
  const phoneValidation = validateNepalPhoneLocal(body.phone);
  if (!phoneValidation.valid) {
    throw createError({
      statusCode: 400,
      statusMessage: phoneValidation.error || 'Invalid phone number format',
    });
  }

  const formattedPhone = formatPhoneWithCountryCodeLocal(body.phone);

  // Validate secondary phone if provided (numbers only)
  let formattedSecondaryPhone: string | null = null;
  if (body.secondaryPhone && body.secondaryPhone.trim()) {
    const secondaryDigitsOnly = body.secondaryPhone.replace(/\D/g, '');
    
    // Check if secondary phone is also 10 digits
    if (secondaryDigitsOnly.length !== 10) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Secondary phone must be exactly 10 digits',
      });
    }
    
    // Format secondary phone with country code
    formattedSecondaryPhone = '+977' + secondaryDigitsOnly.slice(-10);
    
    // Ensure secondary phone is different from primary phone
    if (formattedSecondaryPhone === formattedPhone) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Secondary phone must be different from primary phone',
      });
    }
  }

  try {
    const customerId = generateId('CUST');

    const [newCustomer] = await db
      .insert(customers)
      .values({
        id: customerId,
        name: body.name.trim(),
        phone: formattedPhone,
        secondaryPhone: formattedSecondaryPhone,
        street: body.street?.trim() || null,
        address: body.address?.trim() || null,
        district: body.district?.trim() || null,
      })
      .returning();

    return newCustomer;
  } catch (error: any) {
    const errorMessage = String(error);
    if (errorMessage.includes('UNIQUE constraint failed')) {
      throw createError({
        statusCode: 409,
        statusMessage: 'This phone number is already registered',
      });
    }
    console.error('Error creating customer:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create customer',
    });
  }
});
