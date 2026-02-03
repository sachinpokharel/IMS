export default defineEventHandler(async (event) => {
  const db = useDB();
  const query = getQuery(event);
  const search = (query.search as string) || '';

  try {
    const allCustomers = await db.query.customers.findMany();
    
    if (!search.trim()) {
      return allCustomers;
    }

    // Filter in-memory
    const searchLower = search.toLowerCase();
    return allCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(searchLower) ||
        c.phone.includes(search)
    );
  } catch (error) {
    console.error('Error fetching customers:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch customers',
    });
  }
});
