/**
 * DTO for creating an audit log entry
 */
export class CreateAuditLogDto {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  method: string;
  path: string;
  ipAddress: string;
  userAgent?: string | null;
  payload?: Record<string, unknown> | null;
  statusCode?: number | null;
}
