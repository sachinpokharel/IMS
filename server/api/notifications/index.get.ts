import { desc, eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const db = useDB();
  const userNotifications = await db
    .select()
    .from(tables.notifications)
    .where(eq(tables.notifications.userId, user.id))
    .orderBy(desc(tables.notifications.createdAt));

  return userNotifications;
});
