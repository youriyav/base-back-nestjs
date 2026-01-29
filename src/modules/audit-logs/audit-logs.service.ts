import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual, FindOptionsWhere } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { CreateAuditLogDto, QueryAuditLogsDto } from './dto';

/**
 * Sensitive fields that should NEVER be logged
 */
const SENSITIVE_FIELDS = [
  'password',
  'newPassword',
  'confirmPassword',
  'oldPassword',
  'currentPassword',
  'token',
  'access_token',
  'refresh_token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'api_key',
  'secret',
  'secretKey',
  'secret_key',
  'authorization',
  'creditCard',
  'credit_card',
  'cardNumber',
  'card_number',
  'cvv',
  'pin',
];

/**
 * AuditLogsService
 *
 * Handles persistence and querying of audit logs.
 * Key responsibilities:
 * - Sanitize payloads before storage
 * - Persist logs asynchronously (non-blocking)
 * - Provide filtering/querying capabilities
 */
@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Create an audit log entry
   * This operation is fire-and-forget to not block the request
   */
  async create(dto: CreateAuditLogDto): Promise<void> {
    try {
      const sanitizedPayload = dto.payload ? this.sanitizePayload(dto.payload) : null;

      const auditLog = this.auditLogRepository.create({
        ...dto,
        payload: sanitizedPayload,
      });

      // Save without awaiting to not block - fire and forget
      this.auditLogRepository.save(auditLog).catch((error) => {
        this.logger.error(`Failed to save audit log: ${error.message}`, error.stack);
      });
    } catch (error) {
      // Never throw - audit logging should not affect application flow
      this.logger.error(`Failed to create audit log: ${(error as Error).message}`);
    }
  }

  /**
   * Query audit logs with filters and pagination
   */
  async findAll(query: QueryAuditLogsDto): Promise<{
    data: AuditLog[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const {
      userId,
      action,
      entity,
      entityId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortOrder = 'DESC',
    } = query;

    const where: FindOptionsWhere<AuditLog> = {};

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;

    // Date range filtering
    if (startDate && endDate) {
      where.createdAt = Between(new Date(startDate), new Date(endDate));
    } else if (startDate) {
      where.createdAt = MoreThanOrEqual(new Date(startDate));
    } else if (endDate) {
      where.createdAt = LessThanOrEqual(new Date(endDate));
    }

    const [data, total] = await this.auditLogRepository.findAndCount({
      where,
      order: { createdAt: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find audit logs for a specific entity
   */
  async findByEntity(entity: string, entityId: string): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { entity, entityId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find audit logs for a specific user
   */
  async findByUser(userId: string, limit = 100): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Sanitize payload by removing sensitive fields
   * Performs deep sanitization for nested objects
   */
  private sanitizePayload(
    payload: Record<string, unknown>,
    additionalExcludeFields: string[] = [],
  ): Record<string, unknown> {
    const fieldsToExclude = [...SENSITIVE_FIELDS, ...additionalExcludeFields];
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(payload)) {
      // Skip sensitive fields (case-insensitive check)
      if (fieldsToExclude.some((field) => field.toLowerCase() === key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
        continue;
      }

      // Recursively sanitize nested objects
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitizePayload(
          value as Record<string, unknown>,
          additionalExcludeFields,
        );
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map((item) =>
          item && typeof item === 'object'
            ? this.sanitizePayload(item as Record<string, unknown>, additionalExcludeFields)
            : item,
        );
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Get distinct action types (for filtering UI)
   */
  async getDistinctActions(): Promise<string[]> {
    const result = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('DISTINCT audit.action', 'action')
      .orderBy('audit.action', 'ASC')
      .getRawMany<{ action: string }>();

    return result.map((r) => r.action);
  }

  /**
   * Get distinct entity types (for filtering UI)
   */
  async getDistinctEntities(): Promise<string[]> {
    const result = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('DISTINCT audit.entity', 'entity')
      .orderBy('audit.entity', 'ASC')
      .getRawMany<{ entity: string }>();

    return result.map((r) => r.entity);
  }
}
