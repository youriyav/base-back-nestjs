import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MenuCategoriesService } from './menu-categories.service';
import { CreateMenuCategoryDto } from './dto/create-menu-category.dto';
import { UpdateMenuCategoryDto } from './dto/update-menu-category.dto';
import { MenuCategory } from './entities/menu-category.entity';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { USER_ROLES } from '@shared/enums/user-roles';
import { ApiResponse as CustomApiResponse } from '@shared/types';

@ApiTags('menu-categories')
@Controller('menu/categories')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class MenuCategoriesController {
  constructor(private readonly menuCategoriesService: MenuCategoriesService) {}

  // The old public GET /menu/categories (unscoped across all restaurants) has
  // been retired in favor of GET /r/:slug/menu/categories (PublicMenuController).
  // Admin/owner listing (scoped to the caller's own restaurant) below.
  @Get()
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.OWNER, USER_ROLES.SERVER, USER_ROLES.CASHIER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all menu categories in the caller's own restaurant" })
  @ApiResponse({ status: 200, description: 'Return all menu categories.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin access required.' })
  async findAll(): Promise<CustomApiResponse<MenuCategory[]>> {
    const categories = await this.menuCategoriesService.findAll();
    return { success: true, data: categories };
  }

  @Post()
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.OWNER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new menu category (Admin only)' })
  @ApiResponse({ status: 201, description: 'The category has been successfully created.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin access required.' })
  @ApiResponse({ status: 409, description: 'Category with this slug already exists.' })
  async create(
    @Body() createMenuCategoryDto: CreateMenuCategoryDto,
  ): Promise<CustomApiResponse<MenuCategory>> {
    const category = await this.menuCategoriesService.create(createMenuCategoryDto);
    return { success: true, data: category };
  }

  @Patch(':id')
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a menu category (Admin only)' })
  @ApiParam({ name: 'id', description: 'Menu category ID (UUID)' })
  @ApiResponse({ status: 200, description: 'The category has been successfully updated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin access required.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  @ApiResponse({ status: 409, description: 'Category with this slug already exists.' })
  async update(
    @Param('id') id: string,
    @Body() updateMenuCategoryDto: UpdateMenuCategoryDto,
  ): Promise<CustomApiResponse<MenuCategory>> {
    const category = await this.menuCategoriesService.update(id, updateMenuCategoryDto);
    return { success: true, data: category };
  }

  @Delete(':id')
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.OWNER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a menu category (Admin only)' })
  @ApiParam({ name: 'id', description: 'Menu category ID (UUID)' })
  @ApiResponse({ status: 204, description: 'The category has been successfully deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin access required.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  @ApiResponse({ status: 409, description: 'Category still has menu items.' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.menuCategoriesService.remove(id);
  }
}
