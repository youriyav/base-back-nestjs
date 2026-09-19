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
import { EmplacementsService } from './emplacements.service';
import { CreateEmplacementDto } from './dto/create-emplacement.dto';
import { UpdateEmplacementDto } from './dto/update-emplacement.dto';
import { Emplacement } from './entities/emplacement.entity';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { USER_ROLES } from '@shared/enums/user-roles';
import { ApiResponse as CustomApiResponse } from '@shared/types';

@ApiTags('emplacements')
@Controller('emplacements')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class EmplacementsController {
  constructor(private readonly emplacementsService: EmplacementsService) {}

  @Get()
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.OWNER, USER_ROLES.SERVER, USER_ROLES.CASHIER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all emplacements in the caller's own restaurant" })
  @ApiResponse({ status: 200, description: 'Return all emplacements.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin access required.' })
  async findAll(): Promise<CustomApiResponse<Emplacement[]>> {
    const emplacements = await this.emplacementsService.findAll();
    return { success: true, data: emplacements };
  }

  @Post()
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.OWNER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new emplacement (Admin only)' })
  @ApiResponse({ status: 201, description: 'The emplacement has been successfully created.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin access required.' })
  @ApiResponse({ status: 409, description: 'Emplacement with this name already exists.' })
  async create(
    @Body() createEmplacementDto: CreateEmplacementDto,
  ): Promise<CustomApiResponse<Emplacement>> {
    const emplacement = await this.emplacementsService.create(createEmplacementDto);
    return { success: true, data: emplacement };
  }

  @Patch(':id')
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an emplacement (Admin only)' })
  @ApiParam({ name: 'id', description: 'Emplacement ID (UUID)' })
  @ApiResponse({ status: 200, description: 'The emplacement has been successfully updated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin access required.' })
  @ApiResponse({ status: 404, description: 'Emplacement not found.' })
  @ApiResponse({ status: 409, description: 'Emplacement with this name already exists.' })
  async update(
    @Param('id') id: string,
    @Body() updateEmplacementDto: UpdateEmplacementDto,
  ): Promise<CustomApiResponse<Emplacement>> {
    const emplacement = await this.emplacementsService.update(id, updateEmplacementDto);
    return { success: true, data: emplacement };
  }

  @Delete(':id')
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.OWNER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an emplacement (Admin only)' })
  @ApiParam({ name: 'id', description: 'Emplacement ID (UUID)' })
  @ApiResponse({ status: 204, description: 'The emplacement has been successfully deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin access required.' })
  @ApiResponse({ status: 404, description: 'Emplacement not found.' })
  @ApiResponse({ status: 409, description: 'Emplacement still has tables.' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.emplacementsService.remove(id);
  }
}
