import { eq, count } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Category ID is required' });
  }

  // Check for products in this category
  const [productRef] = await db
    .select({ count: count() })
    .from(tables.products)
    .where(eq(tables.products.categoryId, id));

  if ((productRef?.count || 0) > 0) {
    throw createError({
      statusCode: 400,
      message: 'Category cannot be deleted because it contains products. Please delete or reassign the products first.',
    });
  }

  try {
    await db.delete(tables.categories).where(eq(tables.categories.id, id));
    return { success: true };
  } catch (error: any) {
    if (error.message?.includes('FOREIGN KEY constraint failed')) {
      throw createError({
        statusCode: 400,
        message: 'Category cannot be deleted because it is referenced by other records.',
      });
    }
    throw error;
  }
});
