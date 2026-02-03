import { desc, eq, and, like, or } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const query = getQuery(event);
  const page = parseInt(query.page as string) || 1;
  const limit = parseInt(query.limit as string) || 50;
  const offset = (page - 1) * limit;
  const entityType = query.entityType as string;
  const action = query.action as string;
  const search = query.search as string;

  const db = useDB();

  // Build where conditions
  const conditions = [];
  if (entityType) {
    conditions.push(eq(tables.activityLogs.entityType, entityType));
  }
  if (action) {
    conditions.push(eq(tables.activityLogs.action, action));
  }
  if (search) {
    conditions.push(
      or(
        like(tables.activityLogs.entityName, `%${search}%`),
        like(tables.activityLogs.details, `%${search}%`)
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Fetch logs with user information
  const logs = await db.query.activityLogs.findMany({
    where,
    limit,
    offset,
    orderBy: [desc(tables.activityLogs.createdAt)],
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // Parse JSON details
  const parsedLogs = logs.map((log) => ({
    ...log,
    details: log.details ? JSON.parse(log.details) : null,
  }));

  return {
    data: parsedLogs,
    pagination: {
      page,
      limit,
      hasMore: logs.length === limit,
    },
  };
});
