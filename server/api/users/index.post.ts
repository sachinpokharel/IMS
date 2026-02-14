import { eq } from 'drizzle-orm';
import { generateId } from '../../utils/id';

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as any;
  console.log('User creation attempt by:', user?.email, 'Role:', user?.role);

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated',
    });
  }

  // Only admins can create users
  if (user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Only administrators can create users',
    });
  }

  const db = useDB();
  const body = await readBody(event);

  if (!body.email || !body.password || !body.name) {
    throw createError({
      statusCode: 400,
      message: 'Email, password, and name are required',
    });
  }

  if (body.password.length < 8) {
    throw createError({
      statusCode: 400,
      message: 'Password must be at least 8 characters',
    });
  }

  const email = body.email.toLowerCase().trim();

  // Check if email already exists
  const existingUser = await db
    .select()
    .from(tables.users)
    .where(eq(tables.users.email, email))
    .get();

  if (existingUser) {
    throw createError({
      statusCode: 400,
      message: 'A user with this email already exists',
    });
  }

  // Hash the password
  const passwordHash = await hashPassword(body.password);

  // Validate role (only member or viewer allowed, not admin)
  const allowedRoles = ['member', 'viewer'] as const;
  const role = allowedRoles.includes(body.role) ? body.role : 'member';

  const userId = generateId();

  // Create the user
  const newUser = {
    id: userId,
    email,
    passwordHash,
    name: body.name.trim(),
    role: role as 'member' | 'viewer',
    isActive: true,
  };

  await db.insert(tables.users).values(newUser);

  // Log activity
  // Note: we manually log because logActivity helper expects event.context.user
  await db.insert(tables.activityLogs).values({
    id: generateId(),
    userId: user.id,
    action: 'created',
    entityType: 'user',
    entityId: userId,
    entityName: email,
    details: JSON.stringify({ role }),
    createdAt: new Date(),
  });

  return {
    id: userId,
    email,
    name: newUser.name,
    role: newUser.role,
    isActive: newUser.isActive,
  };
});
