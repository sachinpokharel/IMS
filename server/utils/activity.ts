import type { H3Event } from 'h3';

export interface LogActivityOptions {
  action: string; // 'created', 'updated', 'deleted', 'login', 'logout', etc.
  entityType: string; // 'product', 'invoice', 'order', 'customer', etc.
  entityId?: string;
  entityName?: string;
  details?: Record<string, any>;
}

export async function logActivity(event: H3Event, options: LogActivityOptions) {
  try {
    const user = event.context.user;
    if (!user) return;

    const db = useDB();
    const headers = getHeaders(event);
    
    await db.insert(tables.activityLogs).values({
      id: generateId(),
      userId: user.id,
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId,
      entityName: options.entityName,
      details: options.details ? JSON.stringify(options.details) : null,
      ipAddress: headers['x-forwarded-for'] || headers['x-real-ip'] || event.node.req.socket?.remoteAddress,
      userAgent: headers['user-agent'],
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
