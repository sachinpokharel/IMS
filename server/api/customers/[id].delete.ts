import { eq } from 'drizzle-orm';
import { customers } from '~~/server/database/schema';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Customer ID is required',
    });
  }

  try {
    const [deletedCustomer] = await db
      .delete(customers)
      .where(eq(customers.id, id))
      .returning();

    if (!deletedCustomer) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Customer not found',
      });
    }

    return { success: true, message: 'Customer deleted successfully' };
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete customer',
    });
  }
});
