import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const db = useDB();
  await db
    .update(tables.notifications)
    .set({ read: true })
    .where(eq(tables.notifications.userId, user.id));

  return { success: true };
});
