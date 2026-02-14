import { desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if (!session.user) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated',
    });
  }

  // Only admins can list users
  if (session.user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Only administrators can manage users',
    });
  }

  const db = useDB();

  const allUsers = await db
    .select({
      id: tables.users.id,
      email: tables.users.email,
      name: tables.users.name,
      role: tables.users.role,
      isActive: tables.users.isActive,
      createdAt: tables.users.createdAt,
    })
    .from(tables.users)
    .orderBy(desc(tables.users.createdAt));

  return allUsers;
});
