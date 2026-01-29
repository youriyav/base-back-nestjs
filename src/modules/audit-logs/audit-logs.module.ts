import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';
import { AuditInterceptor } from './interceptors/audit.interceptor';

/**
 * AuditLogsModule
 *
 * Global module for audit logging functionality.
 * Provides:
 * - AuditLogsService for persistence and querying
 * - AuditInterceptor registered globally
 * - AuditLogsController for admin access to logs
 *
 * The module is marked as @Global so the AuditLogsService
 * is available throughout the application without explicit imports.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditLogsController],
  providers: [
    AuditLogsService,
    // Register interceptor globally
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
