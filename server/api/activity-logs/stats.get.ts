import { sql, gte } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const db = useDB();

  // Get stats for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const stats = await db
    .select({
      action: tables.activityLogs.action,
      entityType: tables.activityLogs.entityType,
      count: sql<number>`count(*)`,
    })
    .from(tables.activityLogs)
    .where(gte(tables.activityLogs.createdAt, thirtyDaysAgo))
    .groupBy(tables.activityLogs.action, tables.activityLogs.entityType);

  // Get recent activity count
  const recentActivity = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(tables.activityLogs)
    .where(gte(tables.activityLogs.createdAt, thirtyDaysAgo));

  return {
    stats,
    totalActivities: recentActivity[0]?.count ?? 0,
  };
});
