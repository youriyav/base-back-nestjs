import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { MenuItem } from './entities/menu-item.entity';
import { MenuCategory } from './entities/menu-category.entity';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { TenantScopedBaseService } from '@shared/services/tenant-scoped-base.service';
import { TenantContextService } from '@shared/tenant-context/tenant-context.service';
import { MinioService } from '@modules/storage/minio.service';
import { MENU_IMAGE_UPLOAD_PATH } from './menu.constants';

@Injectable()
export class MenuItemsService extends TenantScopedBaseService<MenuItem> {
  private readonly logger = new Logger(MenuItemsService.name);

  constructor(
    @InjectRepository(MenuItem)
    private readonly itemRepository: Repository<MenuItem>,
    @InjectRepository(MenuCategory)
    private readonly categoryRepository: Repository<MenuCategory>,
    private readonly minioService: MinioService,
    tenantContext: TenantContextService,
  ) {
    super(itemRepository, tenantContext);
  }

  /**
   * PUBLIC, scoped via SlugTenantResolverGuard (which resolves the tenant from
   * the URL slug and populates the same CLS store TenantContextGuard would).
   * Used exclusively by PublicMenuController's /r/:slug/menu/items route.
   */
  async findPublicScoped(params: { category?: string; search?: string }): Promise<MenuItem[]> {
    const restaurantId = this.tenantContext.getRestaurantIdOrThrow();
    const qb = this.itemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.category', 'category')
      .where('item.isAvailable = :isAvailable', { isAvailable: true })
      .andWhere('item.restaurantId = :restaurantId', { restaurantId });

    if (params.category) {
      qb.andWhere('category.slug = :slug', { slug: params.category });
    }

    if (params.search) {
      qb.andWhere('item.name ILIKE :search', { search: `%${params.search}%` });
    }

    qb.orderBy('category.order', 'ASC').addOrderBy('item.order', 'ASC');

    return qb.getMany();
  }

  async findAllAdmin(): Promise<MenuItem[]> {
    return this.findAllScoped(undefined, {
      relations: ['category'],
      order: { order: 'ASC' },
    });
  }

  async findOne(id: string): Promise<MenuItem> {
    return this.findWithCategoryOrFail(id);
  }

  async create(createMenuItemDto: CreateMenuItemDto): Promise<MenuItem> {
    const category = await this.categoryRepository.findOne({
      where: {
        id: createMenuItemDto.categoryId,
        restaurantId: this.tenantContext.getRestaurantIdOrThrow(),
      } as FindOptionsWhere<MenuCategory>,
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${createMenuItemDto.categoryId} not found`);
    }

    const saved = await this.saveScoped(createMenuItemDto);
    return this.findWithCategoryOrFail(saved.id);
  }

  async update(id: string, updateMenuItemDto: UpdateMenuItemDto): Promise<MenuItem> {
    const item = await this.findWithCategoryOrFail(id);

    if (updateMenuItemDto.categoryId && updateMenuItemDto.categoryId !== item.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: {
          id: updateMenuItemDto.categoryId,
          restaurantId: this.tenantContext.getRestaurantIdOrThrow(),
        } as FindOptionsWhere<MenuCategory>,
      });

      if (!category) {
        throw new NotFoundException(`Category with ID ${updateMenuItemDto.categoryId} not found`);
      }
    }

    return this.updateScoped(id, updateMenuItemDto).then(() => this.findWithCategoryOrFail(id));
  }

  async remove(id: string): Promise<void> {
    const item = await this.findWithCategoryOrFail(id);

    if (item.imageObjectKey) {
      await this.deleteImageObject(item.restaurantId, item.imageObjectKey);
    }

    await this.softDeleteScoped(id);
  }

  async uploadImage(id: string, file: Express.Multer.File): Promise<MenuItem> {
    const item = await this.findWithCategoryOrFail(id);
    const restaurantId = this.tenantContext.getRestaurantIdOrThrow();

    if (item.imageObjectKey) {
      await this.deleteImageObject(restaurantId, item.imageObjectKey);
    }

    const result = await this.minioService.uploadFile(restaurantId, file, MENU_IMAGE_UPLOAD_PATH);

    item.imageUrl = result.url;
    item.imageObjectKey = result.objectKey;
    await this.itemRepository.save(item);
    return this.findWithCategoryOrFail(id);
  }

  /**
   * findOneScopedOrFail() doesn't support relations, so this goes through the
   * protected scope() helper directly — still funneled through
   * getRestaurantIdOrThrow(), just not via the named *Scoped wrapper.
   */
  private async findWithCategoryOrFail(id: string): Promise<MenuItem> {
    const item = await this.itemRepository.findOne({
      where: { id, ...this.scope() } as FindOptionsWhere<MenuItem>,
      relations: ['category'],
    });

    if (!item) {
      throw new NotFoundException(`Menu item with ID ${id} not found`);
    }

    return item;
  }

  private async deleteImageObject(restaurantId: string, objectKey: string): Promise<void> {
    try {
      await this.minioService.deleteFile(restaurantId, objectKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to delete MinIO object ${objectKey}: ${message}`);
    }
  }
}
