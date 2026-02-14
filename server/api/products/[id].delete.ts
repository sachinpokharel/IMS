import { eq, or, count } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Product ID is required' });
  }

  // Check if product is referenced in invoice_items or order_items
  const [invoiceRef] = await db
    .select({ count: count() })
    .from(tables.invoiceItems)
    .where(eq(tables.invoiceItems.productId, id));

  const [orderRef] = await db
    .select({ count: count() })
    .from(tables.orderItems)
    .where(eq(tables.orderItems.productId, id));

  if ((invoiceRef?.count || 0) > 0 || (orderRef?.count || 0) > 0) {
    throw createError({
      statusCode: 400,
      message: 'Product cannot be deleted because it is referenced in invoices or orders. Please deactivate it instead.',
    });
  }

  try {
    await db.delete(tables.products).where(eq(tables.products.id, id));
    return { success: true };
  } catch (error: any) {
    if (error.message?.includes('FOREIGN KEY constraint failed')) {
      throw createError({
        statusCode: 400,
        message: 'Product cannot be deleted because it is still referenced by other records. Please deactivate it instead.',
      });
    }
    throw error;
  }
});
