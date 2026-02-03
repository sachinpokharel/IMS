import { invoices } from '~~/server/database/schema';
import { desc, eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const query = getQuery(event);
  const status = (query.status as string) || '';
  const customerId = (query.customerId as string) || '';

  try {
    let queryBuilder = db.query.invoices.findMany({
      with: {
        customer: true,
        items: {
          with: {
            product: true,
            variant: true,
          },
        },
        payments: true,
      },
      orderBy: desc(invoices.issuedDate),
    });

    const result = await queryBuilder;
    
    // Filter by customerId if provided
    let filtered = result;
    if (customerId) {
      filtered = result.filter((inv) => inv.customerId === customerId);
    }
    
    // Filter by status if provided
    if (status && status !== 'all') {
      filtered = filtered.filter((inv) => inv.status === status);
    }

    return filtered;
  } catch (error) {
    console.error('Error fetching invoices:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch invoices',
    });
  }
});
