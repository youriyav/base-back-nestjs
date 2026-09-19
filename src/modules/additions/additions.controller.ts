import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdditionsService } from './additions.service';
import { CreateAdditionDto } from './dto/create-addition.dto';
import { QueryAdditionsDto } from './dto/query-additions.dto';
import { Addition } from './entities/addition.entity';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { User } from '@modules/auth/decorators/user.decorator';
import { User as UserEntity } from '@modules/users/users.entity';
import { USER_ROLES } from '@shared/enums/user-roles';
import { ApiResponse as CustomApiResponse } from '@shared/types';

@ApiTags('additions')
@Controller('additions')
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AdditionsController {
  constructor(private readonly additionsService: AdditionsService) {}

  @Post()
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.OWNER, USER_ROLES.SERVER, USER_ROLES.CASHIER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record an addition, printed at the cashier — idempotent by clientId' })
  @ApiResponse({ status: 201, description: 'The addition has been recorded (or already existed).' })
  @ApiResponse({ status: 400, description: 'Invalid payload, or table not found in this restaurant.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async create(
    @Body() createAdditionDto: CreateAdditionDto,
    @User() user: Partial<UserEntity>,
  ): Promise<CustomApiResponse<Addition>> {
    const addition = await this.additionsService.create(createAdditionDto, user.id!);
    return { success: true, data: addition };
  }

  @Get()
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.OWNER)
  @ApiOperation({ summary: "List the caller's own restaurant's additions, filterable by day and cashier" })
  @ApiResponse({ status: 200, description: 'Return paginated additions.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async findAll(@Query() query: QueryAdditionsDto): Promise<
    CustomApiResponse<{
      data: Addition[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>
  > {
    const result = await this.additionsService.findAll(query);
    return { success: true, data: result };
  }
}
