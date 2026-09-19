import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiResponse as CustomApiResponse } from '@shared/types';
import { User } from './users.entity';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { USER_ROLES } from '@shared/enums/user-roles';
import { CrossTenant } from '@shared/tenant-context';

@ApiTags('users')
@Controller('users')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.OWNER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'The user has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin access required.' })
  @ApiResponse({ status: 409, description: 'User with email already exists.' })
  async create(@Body() createUserDto: CreateUserDto): Promise<CustomApiResponse<Partial<User>>> {
    // Use gymRole for backward compatibility, otherwise use role
    const user = await this.usersService.create(createUserDto);
    return {
      success: true,
      data: user,
    };
  }

  @Get()
  @Roles(USER_ROLES.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all users in the caller's own restaurant" })
  @ApiResponse({ status: 200, description: 'Return all users in the current restaurant.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Owner access required.' })
  async findAll(): Promise<CustomApiResponse<Partial<User>[]>> {
    const users = await this.usersService.findAll();
    return {
      success: true,
      data: users,
    };
  }

  @Get('all')
  @Roles(USER_ROLES.SUPER_ADMIN)
  @CrossTenant()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users across every restaurant (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Return all users across every restaurant.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Super Admin access required.' })
  async findAllAcrossAllRestaurants(): Promise<CustomApiResponse<Partial<User>[]>> {
    const users = await this.usersService.findAllAcrossAllRestaurants();
    return {
      success: true,
      data: users,
    };
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Return the user.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async findOne(@Param('id') id: string): Promise<CustomApiResponse<Partial<User>>> {
    const user = await this.usersService.findOne(id);
    return {
      success: true,
      data: user,
    };
  }

  @Get(':id/access-code')
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Reveal a SERVER/CASHIER user's 4-digit mobile access code" })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Return the access code.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Super Admin or Owner access required.' })
  @ApiResponse({ status: 404, description: 'User not found or has no access code.' })
  async getAccessCode(
    @Param('id') id: string,
  ): Promise<CustomApiResponse<{ accessCode: string | null }>> {
    const data = await this.usersService.getAccessCode(id);
    return {
      success: true,
      data,
    };
  }

  @Patch(':id')
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'The user has been successfully updated.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({ status: 409, description: 'Email already taken by another user.' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<CustomApiResponse<Partial<User>>> {
    const user = await this.usersService.update(id, updateUserDto);
    return {
      success: true,
      data: user,
    };
  }

  @Delete(':id')
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.OWNER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user (Super Admin or Owner only)' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({
    status: 204,
    description: 'The user has been successfully deleted.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Super Admin or Owner access required.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.usersService.remove(id);
  }
}
