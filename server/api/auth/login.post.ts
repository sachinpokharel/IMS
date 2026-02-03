import { users } from '../../database/schema';
import { eq, and } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const body = await readBody(event);

  if (!body.email || !body.password) {
    throw createError({
      statusCode: 400,
      message: 'Email and password are required',
    });
  }

  // Find user by email
  const user = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.email, body.email.toLowerCase().trim()),
        eq(users.isActive, true)
      )
    )
    .get();

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Invalid email or password',
    });
  }

  // Verify password
  const isValid = await verifyPassword(user.passwordHash, body.password);
  if (!isValid) {
    throw createError({
      statusCode: 401,
      message: 'Invalid email or password',
    });
  }

  // Set user session
  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });

  // Log login activity
  const headers = getHeaders(event);
  const db2 = useDB();
  await db2.insert(tables.activityLogs).values({
    id: generateId(),
    userId: user.id,
    action: 'login',
    entityType: 'auth',
    entityName: user.email,
    ipAddress: headers['x-forwarded-for'] || headers['x-real-ip'] || event.node.req.socket?.remoteAddress,
    userAgent: headers['user-agent'],
  });

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
});
