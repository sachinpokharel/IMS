import { eq } from 'drizzle-orm';
import { invoices } from '~~/server/database/schema';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id');
  const body = await readBody<{
    status?: string;
    dueDate?: number;
    notes?: string;
    discountAmount?: number;
    deliveryCharge?: number;
    paymentMethod?: string;
  }>(event);

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invoice ID is required',
    });
  }

  try {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.status) updateData.status = body.status;
    if (body.dueDate !== undefined) updateData.dueDate = new Date(body.dueDate);
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.discountAmount !== undefined) updateData.discountAmount = body.discountAmount;
    if (body.deliveryCharge !== undefined) updateData.deliveryCharge = body.deliveryCharge;
    if (body.paymentMethod !== undefined) updateData.paymentMethod = body.paymentMethod;

    // If updating discount or delivery charge, recalculate total
    if (body.discountAmount !== undefined || body.deliveryCharge !== undefined) {
      // Fetch current invoice to get subtotal and tax
      const currentInvoice = await db.query.invoices.findFirst({
        where: eq(invoices.id, id),
      });

      if (currentInvoice) {
        const subtotal = currentInvoice.subtotal || 0;
        const taxAmount = currentInvoice.taxAmount || 0;
        const discount = body.discountAmount !== undefined ? body.discountAmount : (currentInvoice.discountAmount || 0);
        const delivery = body.deliveryCharge !== undefined ? body.deliveryCharge : (currentInvoice.deliveryCharge || 0);
        
        updateData.totalAmount = subtotal + taxAmount - discount + delivery;
      }
    }

    const [updated] = await db
      .update(invoices)
      .set(updateData)
      .where(eq(invoices.id, id))
      .returning();

    if (!updated) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Invoice not found',
      });
    }

    return updated;
  } catch (error) {
    console.error('Error updating invoice:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update invoice',
    });
  }
});
