import { db } from '../db/index.js';
import { auditLog } from '../db/schema.js';

export class AuditService {
  async logAction(
    actorId: string,
    role: string,
    action: string,
    entityType: string,
    entityId?: string | null,
    diffJson?: any,
    description?: string | null
  ) {
    const [entry] = await db
      .insert(auditLog)
      .values({
        actorId,
        role,
        action,
        entityType,
        entityId: entityId || null,
        diffJson: diffJson || null,
        description: description || null,
      })
      .returning();

    return entry;
  }
}
