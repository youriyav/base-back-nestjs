import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap, catchError } from 'rxjs';
import { Request, Response } from 'express';
import { AuditLogsService } from '../audit-logs.service';
import { AUDIT_METADATA_KEY, AuditOptions } from '../decorators/audit.decorator';
import { CreateAuditLogDto } from '../dto';

/**
 * Request with authentication context
 */
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
    isAdmin?: boolean;
  };
}

/**
 * Paths to ignore for audit logging
 */
const IGNORED_PATHS = ['/health', '/api/health', '/favicon.ico', '/api-docs', '/swagger'];

/**
 * AuditInterceptor
 *
 * Global interceptor that automatically logs auditable actions.
 *
 * Key behaviors:
 * - Only logs endpoints decorated with @Audit
 * - Extracts user context from request
 * - Sanitizes payloads (sensitive data removed by service)
 * - Logs AFTER successful response (not on failure, unless explicitly needed)
 * - Non-blocking: failures in audit logging don't affect the request
 * - Ignores health checks and documentation endpoints
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Get audit metadata from decorator
    const auditOptions = this.reflector.get<AuditOptions>(AUDIT_METADATA_KEY, context.getHandler());

    // If no @Audit decorator, skip logging
    if (!auditOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    // Skip ignored paths
    if (this.shouldIgnore(request.path)) {
      return next.handle();
    }

    // Prepare base audit data
    const auditData = this.prepareAuditData(request, auditOptions);

    return next.handle().pipe(
      tap(() => {
        // Log successful operations
        auditData.statusCode = response.statusCode;
        this.logAudit(auditData);
      }),
      catchError((error) => {
        // Optionally log failed operations (for security-sensitive actions)
        if (this.shouldLogFailure(auditOptions.action)) {
          auditData.statusCode = error.status || 500;
          auditData.payload = {
            ...auditData.payload,
            error: error.message,
          };
          this.logAudit(auditData);
        }
        throw error;
      }),
    );
  }

  /**
   * Prepare audit log data from request
   */
  private prepareAuditData(
    request: AuthenticatedRequest,
    options: AuditOptions,
  ): CreateAuditLogDto {
    const entityId = this.extractEntityId(request);

    return {
      userId: request.user?.id || null,
      action: options.action,
      entity: options.entity,
      entityId,
      method: request.method,
      path: request.originalUrl || request.path,
      ipAddress: this.getClientIp(request),
      userAgent: request.headers['user-agent'] || null,
      payload: options.captureBody !== false ? this.extractPayload(request) : null,
    };
  }

  /**
   * Extract entity ID from request params
   * Looks for common param names: id, userId, etc.
   */
  private extractEntityId(request: AuthenticatedRequest): string | null {
    const params = request.params || {};

    // Priority order for entity ID extraction
    const idKeys = ['id', 'userId'];

    for (const key of idKeys) {
      if (params[key] && this.isValidUUID(params[key])) {
        return params[key];
      }
    }

    return null;
  }

  /**
   * Extract payload from request, filtering sensitive data
   */
  private extractPayload(request: AuthenticatedRequest): Record<string, unknown> | null {
    const payload: Record<string, unknown> = {};

    // Include query params (for GET requests)
    if (Object.keys(request.query || {}).length > 0) {
      payload.query = request.query;
    }

    // Include body (for POST, PUT, PATCH, DELETE)
    if (request.body && Object.keys(request.body).length > 0) {
      payload.body = { ...request.body };
    }

    // Include route params
    if (Object.keys(request.params || {}).length > 0) {
      payload.params = request.params;
    }

    return Object.keys(payload).length > 0 ? payload : null;
  }

  /**
   * Get client IP address, handling proxies
   */
  private getClientIp(request: Request): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
      return ips.trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    return request.ip || request.socket?.remoteAddress || 'unknown';
  }

  /**
   * Check if path should be ignored
   */
  private shouldIgnore(path: string): boolean {
    return IGNORED_PATHS.some((ignored) => path.startsWith(ignored));
  }

  /**
   * Determine if failed operations should be logged
   * Security-sensitive actions should log failures
   */
  private shouldLogFailure(action: string): boolean {
    const securityActions = ['LOGIN', 'LOGIN_FAILED', 'RESET_PASSWORD', 'REQUEST_PASSWORD_RESET'];
    return securityActions.includes(action);
  }

  /**
   * Validate UUID format
   */
  private isValidUUID(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  /**
   * Fire and forget audit log creation
   */
  private logAudit(data: CreateAuditLogDto): void {
    // Non-blocking: don't await
    this.auditLogsService.create(data).catch((error) => {
      this.logger.error(`Failed to log audit: ${error.message}`);
    });
  }
}
