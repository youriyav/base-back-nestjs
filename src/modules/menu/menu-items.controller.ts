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
  UploadedFile,
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
import { MenuItemsService } from './menu-items.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { MenuItem } from './entities/menu-item.entity';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { USER_ROLES } from '@shared/enums/user-roles';
import { ApiResponse as CustomApiResponse } from '@shared/types';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

@ApiTags('menu-items')
@Controller('menu/items')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class MenuItemsController {
  constructor(private readonly menuItemsService: MenuItemsService) {}

  // The old public GET /menu/items (unscoped across all restaurants) has been
  // retired in favor of GET /r/:slug/menu/items (PublicMenuController).

  @Get('all')
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.OWNER, USER_ROLES.SERVER, USER_ROLES.CASHIER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all menu items including unavailable ones (Admin only)' })
  @ApiResponse({ status: 200, description: 'Return all menu items.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin access required.' })
  async findAllAdmin(): Promise<CustomApiResponse<MenuItem[]>> {
    const items = await this.menuItemsService.findAllAdmin();
    return { success: true, data: items };
  }

  @Post()
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.OWNER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new menu item (Admin only)' })
  @ApiResponse({ status: 201, description: 'The menu item has been successfully created.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin access required.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  async create(@Body() createMenuItemDto: CreateMenuItemDto): Promise<CustomApiResponse<MenuItem>> {
    const item = await this.menuItemsService.create(createMenuItemDto);
    return { success: true, data: item };
  }

  @Patch(':id')
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a menu item (Admin only)' })
  @ApiParam({ name: 'id', description: 'Menu item ID (UUID)' })
  @ApiResponse({ status: 200, description: 'The menu item has been successfully updated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin access required.' })
  @ApiResponse({ status: 404, description: 'Menu item or category not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateMenuItemDto: UpdateMenuItemDto,
  ): Promise<CustomApiResponse<MenuItem>> {
    const item = await this.menuItemsService.update(id, updateMenuItemDto);
    return { success: true, data: item };
  }

  @Delete(':id')
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.OWNER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a menu item, including its stored image (Admin only)' })
  @ApiParam({ name: 'id', description: 'Menu item ID (UUID)' })
  @ApiResponse({ status: 204, description: 'The menu item has been successfully deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin access required.' })
  @ApiResponse({ status: 404, description: 'Menu item not found.' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.menuItemsService.remove(id);
  }

  @Post(':id/image')
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.OWNER)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_SIZE_BYTES } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiParam({ name: 'id', description: 'Menu item ID (UUID)' })
  @ApiOperation({ summary: 'Upload or replace a menu item photo (Admin only)' })
  @ApiResponse({ status: 200, description: 'Image uploaded, menu item updated.' })
  @ApiResponse({ status: 400, description: 'No file provided or invalid file type.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin access required.' })
  @ApiResponse({ status: 404, description: 'Menu item not found.' })
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ): Promise<CustomApiResponse<MenuItem>> {
    const item = await this.menuItemsService.uploadImage(id, file);
    return { success: true, data: item };
  }
}
