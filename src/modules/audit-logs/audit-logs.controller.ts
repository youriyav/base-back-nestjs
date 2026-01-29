import { Controller, Get, Query, UseGuards, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { QueryAuditLogsDto } from './dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { USER_ROLES } from '@shared/enums/user-roles';
import { ApiResponse as CustomApiResponse } from '@shared/types';
import { AuditLog } from './entities/audit-log.entity';

/**
 * AuditLogsController
 *
 * Provides read-only access to audit logs.
 *
 * Access control:
 * - SUPER_ADMIN: Can view all logs
 * - OWNER: Can view logs for their scope
 */
@ApiTags('audit-logs')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Roles(USER_ROLES.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get all audit logs (SUPER_ADMIN only)',
    description:
      'Returns paginated audit logs with optional filters. Only accessible by SUPER_ADMIN.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated audit logs',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires SUPER_ADMIN role' })
  async findAll(@Query() query: QueryAuditLogsDto): Promise<
    CustomApiResponse<{
      data: AuditLog[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>
  > {
    const result = await this.auditLogsService.findAll(query);
    return {
      success: true,
      data: result,
    };
  }

  @Get('entity/:entity/:entityId')
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.OWNER)
  @ApiOperation({
    summary: 'Get audit logs for a specific entity',
    description:
      'Returns all audit logs related to a specific entity (e.g., a user).',
  })
  @ApiParam({ name: 'entity', description: 'Entity type (e.g., USER)', type: 'string' })
  @ApiParam({ name: 'entityId', description: 'Entity ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Returns audit logs for the entity',
  })
  async findByEntity(
    @Param('entity') entity: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
  ): Promise<CustomApiResponse<AuditLog[]>> {
    const data = await this.auditLogsService.findByEntity(entity.toUpperCase(), entityId);
    return {
      success: true,
      data,
    };
  }

  @Get('user/:userId')
  @Roles(USER_ROLES.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get audit logs for a specific user (SUPER_ADMIN only)',
    description: 'Returns all actions performed by a specific user.',
  })
  @ApiParam({ name: 'userId', description: 'User ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Returns audit logs for the user',
  })
  async findByUser(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<CustomApiResponse<AuditLog[]>> {
    const data = await this.auditLogsService.findByUser(userId);
    return {
      success: true,
      data,
    };
  }

  @Get('filters/actions')
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.OWNER)
  @ApiOperation({
    summary: 'Get distinct action types',
    description: 'Returns list of all unique action types in the audit logs for filter UI.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of action types',
  })
  async getActions(): Promise<CustomApiResponse<string[]>> {
    const data = await this.auditLogsService.getDistinctActions();
    return {
      success: true,
      data,
    };
  }

  @Get('filters/entities')
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.OWNER)
  @ApiOperation({
    summary: 'Get distinct entity types',
    description: 'Returns list of all unique entity types in the audit logs for filter UI.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of entity types',
  })
  async getEntities(): Promise<CustomApiResponse<string[]>> {
    const data = await this.auditLogsService.getDistinctEntities();
    return {
      success: true,
      data,
    };
  }
}
