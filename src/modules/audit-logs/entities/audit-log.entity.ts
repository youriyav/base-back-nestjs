import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * AuditLog Entity
 *
 * Stores immutable audit trail for all critical actions in the system.
 * Designed for compliance (RGPD), security monitoring, and debugging.
 *
 * Key design decisions:
 * - No UpdateDateColumn: logs are immutable
 * - No DeleteDateColumn: logs cannot be soft-deleted
 * - Indexed columns for efficient querying
 * - JSONB payload for flexible data storage
 */
@Entity({ name: 'audit_logs' })
@Index(['userId'])
@Index(['action'])
@Index(['createdAt'])
@Index(['entity', 'entityId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * ID of the user who performed the action
   * Nullable for unauthenticated actions (e.g., failed login attempts)
   */
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  /**
   * The action performed (e.g., CREATE_USER, LOGIN)
   */
  @Column({ type: 'varchar', length: 100 })
  action: string;

  /**
   * The entity type affected (e.g., USER, AUTH)
   */
  @Column({ type: 'varchar', length: 100 })
  entity: string;

  /**
   * The ID of the specific entity affected (if applicable)
   */
  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId: string | null;

  /**
   * HTTP method used (GET, POST, PUT, PATCH, DELETE)
   */
  @Column({ type: 'varchar', length: 10 })
  method: string;

  /**
   * Request path (e.g., /api/users/123)
   */
  @Column({ type: 'varchar', length: 500 })
  path: string;

  /**
   * Client IP address
   */
  @Column({ name: 'ip_address', type: 'varchar', length: 45 })
  ipAddress: string;

  /**
   * Client User-Agent string
   */
  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  /**
   * Sanitized request payload (sensitive fields removed)
   * Stored as JSONB for efficient querying
   */
  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;

  /**
   * HTTP status code of the response
   */
  @Column({ name: 'status_code', type: 'int', nullable: true })
  statusCode: number | null;

  /**
   * Timestamp when the action was performed
   */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
