import { desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as any;

  // Only admins can list users
  if (!user || user.role !== 'admin') {
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
