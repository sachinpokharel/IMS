import { eq, count } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Supplier ID is required' });
  }

  // Check for products from this supplier
  const [productRef] = await db
    .select({ count: count() })
    .from(tables.products)
    .where(eq(tables.products.supplierId, id));

  if ((productRef?.count || 0) > 0) {
    throw createError({
      statusCode: 400,
      message: 'Supplier cannot be deleted because they are linked to products. Please remove the link first.',
    });
  }

  try {
    await db.delete(tables.suppliers).where(eq(tables.suppliers.id, id));
    return { success: true };
  } catch (error: any) {
    if (error.message?.includes('FOREIGN KEY constraint failed')) {
      throw createError({
        statusCode: 400,
        message: 'Supplier cannot be deleted because they are referenced by other records (invoices, movements, etc.).',
      });
    }
    throw error;
  }
});
