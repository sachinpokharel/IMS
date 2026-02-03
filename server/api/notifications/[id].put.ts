import { eq, and } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, message: 'Notification ID is required' });
  }

  const body = await readBody(event);
  const db = useDB();

  await db
    .update(tables.notifications)
    .set({
      read: body.read ?? true,
    })
    .where(
      and(
        eq(tables.notifications.id, id),
        eq(tables.notifications.userId, user.id)
      )
    );

  return { success: true };
});
