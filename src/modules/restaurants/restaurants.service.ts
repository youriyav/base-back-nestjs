import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { BaseService } from '@shared/services/base.service';
import { MinioService } from '@modules/storage/minio.service';
import { Restaurant, RESTAURANT_STATUS } from './entities/restaurant.entity';
import {
  RESTAURANT_LOGO_UPLOAD_PATH,
  RESTAURANT_PLAN_PRICE_MONTHLY,
} from './restaurants.constants';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { QueryRestaurantsDto } from './dto/query-restaurants.dto';

export type RestaurantWithMrr = Restaurant & { mrr: number };

/**
 * Restaurant is the tenant root, not a tenant member — it has no restaurantId
 * to scope by, so this extends the plain BaseService, not TenantScopedBaseService.
 */
@Injectable()
export class RestaurantsService extends BaseService<Restaurant> {
  private readonly logger = new Logger(RestaurantsService.name);

  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
    private readonly minioService: MinioService,
  ) {
    super(restaurantRepository);
  }

  /**
   * MRR is derived, not stored: a restaurant only contributes revenue while
   * `status` is ACTIVE, at its current plan's monthly price.
   */
  private withMrr(restaurant: Restaurant): RestaurantWithMrr {
    const mrr =
      restaurant.status === RESTAURANT_STATUS.ACTIVE
        ? RESTAURANT_PLAN_PRICE_MONTHLY[restaurant.plan]
        : 0;
    return { ...restaurant, mrr };
  }

  async findAllPaginated(query: QueryRestaurantsDto): Promise<{
    data: RestaurantWithMrr[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const { status, page = 1, limit = 20 } = query;

    const where: FindOptionsWhere<Restaurant> = {};
    if (status) where.status = status;

    const [data, total] = await this.restaurantRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: data.map((restaurant) => this.withMrr(restaurant)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  private async findEntityOrFail(id: string): Promise<Restaurant> {
    const restaurant = await this.restaurantRepository.findOne({ where: { id } });

    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }

    return restaurant;
  }

  async findOne(id: string): Promise<RestaurantWithMrr> {
    return this.withMrr(await this.findEntityOrFail(id));
  }

  async create(dto: CreateRestaurantDto): Promise<Restaurant> {
    const existing = await this.restaurantRepository.findOne({ where: { slug: dto.slug } });

    if (existing) {
      throw new ConflictException(`Restaurant with slug ${dto.slug} already exists`);
    }

    return this.restaurantRepository.save(dto);
  }

  async update(id: string, dto: UpdateRestaurantDto): Promise<RestaurantWithMrr> {
    const restaurant = await this.findEntityOrFail(id);

    if (dto.slug && dto.slug !== restaurant.slug) {
      const clash = await this.restaurantRepository.findOne({ where: { slug: dto.slug } });
      if (clash) {
        throw new ConflictException(`Restaurant with slug ${dto.slug} already exists`);
      }
    }

    Object.assign(restaurant, dto);
    const saved = await this.restaurantRepository.save(restaurant);
    return this.withMrr(saved);
  }

  async remove(id: string): Promise<void> {
    const restaurant = await this.findEntityOrFail(id);

    if (restaurant.logoObjectKey) {
      await this.deleteLogoObject(restaurant.id, restaurant.logoObjectKey);
    }

    await this.softDelete(id);
  }

  /**
   * Used by the public /r/:slug/... routes. Returns an identical NotFoundException
   * for "slug doesn't exist" and "slug exists but isn't active" — deliberately
   * indistinguishable so a probe can't learn whether a given restaurant exists.
   */
  async findActiveBySlugOrNotFound(slug: string): Promise<Restaurant> {
    const restaurant = await this.restaurantRepository.findOne({ where: { slug } });

    if (!restaurant || restaurant.status !== RESTAURANT_STATUS.ACTIVE) {
      throw new NotFoundException('Restaurant not found');
    }

    return restaurant;
  }

  /**
   * Restaurant is the tenant root itself, so the MinIO "tenant id" for
   * bucket-per-restaurant purposes is its own id, not a tenant-context value
   * (mirrors how impersonate() already uses restaurant.id directly).
   */
  async uploadLogo(id: string, file: Express.Multer.File): Promise<RestaurantWithMrr> {
    const restaurant = await this.findEntityOrFail(id);

    if (restaurant.logoObjectKey) {
      await this.deleteLogoObject(restaurant.id, restaurant.logoObjectKey);
    }

    const result = await this.minioService.uploadFile(
      restaurant.id,
      file,
      RESTAURANT_LOGO_UPLOAD_PATH,
    );

    restaurant.logoUrl = result.url;
    restaurant.logoObjectKey = result.objectKey;
    const saved = await this.restaurantRepository.save(restaurant);
    return this.withMrr(saved);
  }

  private async deleteLogoObject(restaurantId: string, objectKey: string): Promise<void> {
    try {
      await this.minioService.deleteFile(restaurantId, objectKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to delete MinIO logo object ${objectKey}: ${message}`);
    }
  }
}
