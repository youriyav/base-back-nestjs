import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuCategory } from './entities/menu-category.entity';
import { MenuItem } from './entities/menu-item.entity';
import { CreateMenuCategoryDto } from './dto/create-menu-category.dto';
import { UpdateMenuCategoryDto } from './dto/update-menu-category.dto';
import { TenantScopedBaseService } from '@shared/services/tenant-scoped-base.service';
import { TenantContextService } from '@shared/tenant-context/tenant-context.service';

@Injectable()
export class MenuCategoriesService extends TenantScopedBaseService<MenuCategory> {
  constructor(
    @InjectRepository(MenuCategory)
    private readonly categoryRepository: Repository<MenuCategory>,
    @InjectRepository(MenuItem)
    private readonly itemRepository: Repository<MenuItem>,
    tenantContext: TenantContextService,
  ) {
    super(categoryRepository, tenantContext);
  }

  async findAll(): Promise<MenuCategory[]> {
    return this.findAllScoped(undefined, { order: { order: 'ASC' } });
  }

  async findOne(id: string): Promise<MenuCategory> {
    return this.findOneScopedOrFail(id);
  }

  async create(createMenuCategoryDto: CreateMenuCategoryDto): Promise<MenuCategory> {
    const existing = await this.categoryRepository.findOne({
      where: {
        slug: createMenuCategoryDto.slug,
        restaurantId: this.tenantContext.getRestaurantIdOrThrow(),
      },
    });

    if (existing) {
      throw new ConflictException(
        `Category with slug ${createMenuCategoryDto.slug} already exists`,
      );
    }

    return this.saveScoped(createMenuCategoryDto);
  }

  async update(id: string, updateMenuCategoryDto: UpdateMenuCategoryDto): Promise<MenuCategory> {
    const category = await this.findOneScopedOrFail(id);

    if (updateMenuCategoryDto.slug && updateMenuCategoryDto.slug !== category.slug) {
      const clash = await this.categoryRepository.findOne({
        where: {
          slug: updateMenuCategoryDto.slug,
          restaurantId: this.tenantContext.getRestaurantIdOrThrow(),
        },
      });

      if (clash) {
        throw new ConflictException(
          `Category with slug ${updateMenuCategoryDto.slug} already exists`,
        );
      }
    }

    return this.updateScoped(id, updateMenuCategoryDto);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOneScopedOrFail(id);
    const itemCount = await this.itemRepository.count({
      where: { categoryId: id, restaurantId: category.restaurantId },
    });

    if (itemCount > 0) {
      throw new ConflictException(
        'Cannot delete a category that still has menu items. Move or delete its items first.',
      );
    }

    await this.softDeleteScoped(id);
  }
}
