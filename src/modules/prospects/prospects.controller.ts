import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProspectsService } from './prospects.service';
import { CreateDemoRequestDto } from './dto/create-demo-request.dto';
import { QueryDemoRequestsDto } from './dto/query-demo-requests.dto';
import { UpdateDemoRequestStatusDto } from './dto/update-demo-request-status.dto';
import { DemoRequest } from './entities/demo-request.entity';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { USER_ROLES } from '@shared/enums/user-roles';
import { ApiResponse as CustomApiResponse } from '@shared/types';
import { Public } from '@shared/tenant-context';

@ApiTags('prospects')
@Controller('prospects')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class ProspectsController {
  constructor(private readonly prospectsService: ProspectsService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a demo request (public)' })
  @ApiResponse({ status: 201, description: 'The demo request has been received.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async create(
    @Body() createDemoRequestDto: CreateDemoRequestDto,
  ): Promise<CustomApiResponse<DemoRequest | null>> {
    const demoRequest = await this.prospectsService.create(createDemoRequestDto);
    // Always a generic success, whether the honeypot silently discarded it or not.
    return { success: true, data: demoRequest };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get paginated demo requests, filterable by status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Return paginated demo requests.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin access required.' })
  async findAll(@Query() query: QueryDemoRequestsDto): Promise<
    CustomApiResponse<{
      data: DemoRequest[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>
  > {
    const result = await this.prospectsService.findAll(query);
    return { success: true, data: result };
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a demo request status (Admin only)' })
  @ApiParam({ name: 'id', description: 'Demo request ID (UUID)' })
  @ApiResponse({ status: 200, description: 'The status has been successfully updated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin access required.' })
  @ApiResponse({ status: 404, description: 'Demo request not found.' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDemoRequestStatusDto,
  ): Promise<CustomApiResponse<DemoRequest>> {
    const demoRequest = await this.prospectsService.updateStatus(id, dto.status);
    return { success: true, data: demoRequest };
  }
}
