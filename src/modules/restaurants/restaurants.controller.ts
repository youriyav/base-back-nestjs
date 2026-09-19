import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RestaurantsService, RestaurantWithMrr } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { QueryRestaurantsDto } from './dto/query-restaurants.dto';
import { Restaurant } from './entities/restaurant.entity';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { User } from '@modules/auth/decorators/user.decorator';
import { AuthService } from '@modules/auth/auth.service';
import { User as UserEntity } from '@modules/users/users.entity';
import { USER_ROLES } from '@shared/enums/user-roles';
import { CrossTenant } from '@shared/tenant-context';
import { ApiResponse as CustomApiResponse } from '@shared/types';
import { Audit } from '@modules/audit-logs/decorators';
import { RESTAURANT_ACTIONS, AUDIT_ENTITIES } from '@modules/audit-logs/constants';

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * SUPER_ADMIN-only management of every restaurant. Every route here is
 * inherently cross-tenant (a restaurant can't be scoped to itself), hence
 * @CrossTenant() on all of them — the tenant-isolation test suite asserts
 * this exact route list against @Roles(SUPER_ADMIN).
 */
@ApiTags('restaurants')
@Controller('restaurants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(USER_ROLES.SUPER_ADMIN)
@CrossTenant()
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all restaurants, paginated (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Return paginated restaurants.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Super Admin access required.' })
  async findAll(@Query() query: QueryRestaurantsDto): Promise<
    CustomApiResponse<{
      data: RestaurantWithMrr[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>
  > {
    const result = await this.restaurantsService.findAllPaginated(query);
    return { success: true, data: result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a restaurant by id (Super Admin only)' })
  @ApiParam({ name: 'id', description: 'Restaurant ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Return the restaurant.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Super Admin access required.' })
  @ApiResponse({ status: 404, description: 'Restaurant not found.' })
  async findOne(@Param('id') id: string): Promise<CustomApiResponse<RestaurantWithMrr>> {
    const restaurant = await this.restaurantsService.findOne(id);
    return { success: true, data: restaurant };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new restaurant (Super Admin only)' })
  @ApiResponse({ status: 201, description: 'The restaurant has been successfully created.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Super Admin access required.' })
  @ApiResponse({ status: 409, description: 'Restaurant with this slug already exists.' })
  async create(@Body() dto: CreateRestaurantDto): Promise<CustomApiResponse<Restaurant>> {
    const restaurant = await this.restaurantsService.create(dto);
    return { success: true, data: restaurant };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a restaurant (Super Admin only)' })
  @ApiParam({ name: 'id', description: 'Restaurant ID (UUID)' })
  @ApiResponse({ status: 200, description: 'The restaurant has been successfully updated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Super Admin access required.' })
  @ApiResponse({ status: 404, description: 'Restaurant not found.' })
  @ApiResponse({ status: 409, description: 'Restaurant with this slug already exists.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRestaurantDto,
  ): Promise<CustomApiResponse<RestaurantWithMrr>> {
    const restaurant = await this.restaurantsService.update(id, dto);
    return { success: true, data: restaurant };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a restaurant (Super Admin only)' })
  @ApiParam({ name: 'id', description: 'Restaurant ID (UUID)' })
  @ApiResponse({ status: 204, description: 'The restaurant has been successfully deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Super Admin access required.' })
  @ApiResponse({ status: 404, description: 'Restaurant not found.' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.restaurantsService.remove(id);
  }

  @Post(':id/logo')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_LOGO_SIZE_BYTES } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiParam({ name: 'id', description: 'Restaurant ID (UUID)' })
  @ApiOperation({ summary: 'Upload or replace a restaurant logo (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Logo uploaded, restaurant updated.' })
  @ApiResponse({ status: 400, description: 'No file provided or invalid file type.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Super Admin access required.' })
  @ApiResponse({ status: 404, description: 'Restaurant not found.' })
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ): Promise<CustomApiResponse<RestaurantWithMrr>> {
    const restaurant = await this.restaurantsService.uploadLogo(id, file);
    return { success: true, data: restaurant };
  }

  @Post(':id/impersonate')
  @Audit({ action: RESTAURANT_ACTIONS.IMPERSONATE_START, entity: AUDIT_ENTITIES.RESTAURANT })
  @ApiOperation({ summary: 'View the app as a given restaurant (Super Admin only)' })
  @ApiParam({ name: 'id', description: 'Restaurant ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Returns a short-lived impersonation access token.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Super Admin access required.' })
  @ApiResponse({ status: 404, description: 'Restaurant not found.' })
  async impersonate(
    @Param('id') id: string,
    @User() admin: Partial<UserEntity>,
  ): Promise<CustomApiResponse<{ access_token: string; restaurant: RestaurantWithMrr }>> {
    const restaurant = await this.restaurantsService.findOne(id);
    const { access_token } = this.authService.impersonate(
      admin as Pick<UserEntity, 'id' | 'email' | 'isAdmin' | 'role' | 'restaurantId'>,
      restaurant.id,
    );
    return { success: true, data: { access_token, restaurant } };
  }

  @Post(':id/stop-impersonate')
  @HttpCode(HttpStatus.OK)
  @Audit({ action: RESTAURANT_ACTIONS.IMPERSONATE_END, entity: AUDIT_ENTITIES.RESTAURANT })
  @ApiOperation({
    summary: 'Record the end of an impersonation session (Super Admin only)',
    description:
      'Impersonation tokens are stateless and simply expire — this endpoint exists purely ' +
      'to leave an audit trail of when the admin chose to stop, via the client swapping back ' +
      'to its own token.',
  })
  @ApiParam({ name: 'id', description: 'Restaurant ID (UUID) that was being impersonated' })
  @ApiResponse({ status: 200, description: 'Recorded.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Super Admin access required.' })
  // eslint-disable-next-line @typescript-eslint/require-await
  async stopImpersonate(@Param('id') id: string): Promise<CustomApiResponse<null>> {
    return { success: true, data: null };
  }
}
