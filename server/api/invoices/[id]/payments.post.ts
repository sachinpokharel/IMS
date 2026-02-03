import { eq } from 'drizzle-orm';
import { payments, invoices } from '~~/server/database/schema';
import { generateId } from '~~/server/utils/id';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const invoiceId = getRouterParam(event, 'id');
  const body = await readBody<{
    amount: number;
    method: string;
    reference?: string;
    notes?: string;
  }>(event);

  if (!invoiceId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invoice ID is required',
    });
  }

  if (!body.amount || body.amount <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Payment amount must be greater than 0',
    });
  }

  if (!body.method) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Payment method is required',
    });
  }

  try {
    const paymentId = generateId('PAY');

    const [payment] = await db
      .insert(payments)
      .values({
        id: paymentId,
        invoiceId,
        amount: body.amount,
        method: body.method,
        paidDate: new Date(),
        reference: body.reference,
        notes: body.notes,
      })
      .returning();

    // Check if invoice is fully paid
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
      with: { payments: true },
    });

    if (invoice && invoice.totalAmount) {
      const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0) + body.amount;
      
      if (totalPaid >= invoice.totalAmount) {
        await db
          .update(invoices)
          .set({ status: 'paid' })
          .where(eq(invoices.id, invoiceId));
      }
    }

    return payment;
  } catch (error) {
    console.error('Error recording payment:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to record payment',
    });
  }
});
