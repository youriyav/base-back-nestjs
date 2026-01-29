import { SetMetadata } from '@nestjs/common';
import { AuditAction, AuditEntity } from '../constants';

/**
 * Audit Decorator Metadata Key
 */
export const AUDIT_METADATA_KEY = 'audit:metadata';

/**
 * Audit Decorator Options
 */
export interface AuditOptions {
  /**
   * The action being performed (e.g., CREATE_USER, DELETE_RESTAURANT)
   */
  action: AuditAction | string;

  /**
   * The entity type being affected (e.g., USER, RESTAURANT)
   */
  entity: AuditEntity | string;

  /**
   * Whether to capture request body in the audit log
   * Default: true
   * Set to false for endpoints with sensitive data that cannot be sanitized
   */
  captureBody?: boolean;

  /**
   * Additional fields to exclude from payload sanitization
   * These will be removed from the logged payload
   */
  excludeFields?: string[];
}

/**
 * @Audit Decorator
 *
 * Marks a controller method for audit logging.
 * The AuditInterceptor reads this metadata to determine:
 * - What action is being performed
 * - What entity is affected
 * - Whether to capture request body
 *
 * @example
 * ```typescript
 * @Post()
 * @Audit({ action: 'CREATE_USER', entity: 'USER' })
 * createUser(@Body() dto: CreateUserDto) { ... }
 *
 * @Delete(':id')
 * @Audit({ action: 'DELETE_USER', entity: 'USER', captureBody: false })
 * deleteUser(@Param('id') id: string) { ... }
 * ```
 */
export const Audit = (options: AuditOptions) =>
  SetMetadata(AUDIT_METADATA_KEY, {
    captureBody: true, // Default to capturing body
    excludeFields: [],
    ...options,
  });
