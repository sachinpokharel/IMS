import { eq } from 'drizzle-orm';
import { customers } from '~~/server/database/schema';

// Format phone number to +977 standard format
function formatPhoneWithCountryCode(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '').replace(/^0+/, '');
  const withoutCountryCode = cleaned.replace(/^\+977/, '');
  const lastTenDigits = withoutCountryCode.slice(-10);
  return '+977' + lastTenDigits;
}

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id');
  const body = await readBody<{
    name?: string;
    phone?: string;
    secondaryPhone?: string;
    email?: string;
    street?: string;
    address?: string;
    district?: string;
    deliveryCharge?: number;
    babyName?: string;
    babyDate?: number;
    babyGender?: string;
    notes?: string;
  }>(event);

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Customer ID is required',
    });
  }

  // Validate phone if provided
  if (body.phone) {
    const digitsOnly = body.phone.replace(/\D/g, '');
    if (digitsOnly.length !== 10) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Phone number must be exactly 10 digits',
      });
    }
  }

  // Validate secondary phone if provided
  if (body.secondaryPhone) {
    const digitsOnly = body.secondaryPhone.replace(/\D/g, '');
    if (digitsOnly.length !== 10) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Secondary phone must be exactly 10 digits',
      });
    }
  }

  try {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updateData.name = body.name.trim();

    let formattedPhone: string | undefined;
    let formattedSecondaryPhone: string | undefined;

    if (body.phone !== undefined) {
      formattedPhone = formatPhoneWithCountryCode(body.phone);
      updateData.phone = formattedPhone;
    }
    
    if (body.secondaryPhone !== undefined) {
      if (body.secondaryPhone.trim()) {
        formattedSecondaryPhone = formatPhoneWithCountryCode(body.secondaryPhone);
        // Ensure secondary phone is different from primary phone
        const primaryToCheck = formattedPhone || body.phone; // Use formatted if available, else body
        if (formattedSecondaryPhone === primaryToCheck) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Secondary phone must be different from primary phone',
          });
        }
        updateData.secondaryPhone = formattedSecondaryPhone;
      } else {
        updateData.secondaryPhone = null;
      }
    }
    if (body.street !== undefined) updateData.street = body.street?.trim() || null;
    if (body.address !== undefined) updateData.address = body.address?.trim() || null;
    if (body.district !== undefined) updateData.district = body.district?.trim() || null;
    if (body.email !== undefined) updateData.email = body.email?.trim() || null;
    if (body.deliveryCharge !== undefined) updateData.deliveryCharge = body.deliveryCharge;
    if (body.babyName !== undefined) updateData.babyName = body.babyName?.trim() || null;
    if (body.babyDate !== undefined) updateData.babyDate = body.babyDate || null;
    if (body.babyGender !== undefined) updateData.babyGender = body.babyGender || null;
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;

    const [updatedCustomer] = await db
      .update(customers)
      .set(updateData)
      .where(eq(customers.id, id))
      .returning();

    if (!updatedCustomer) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Customer not found',
      });
    }

    return updatedCustomer;
  } catch (error: any) {
    const errorMessage = String(error);
    if (errorMessage.includes('UNIQUE constraint failed')) {
      throw createError({
        statusCode: 409,
        statusMessage: 'This phone number is already registered',
      });
    }
    console.error('Error updating customer:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update customer',
    });
  }
});
