import { NotFoundException } from '@nestjs/common';
import { DeepPartial, FindManyOptions, FindOptionsWhere, Repository } from 'typeorm';
import { TenantContextService } from '@shared/tenant-context/tenant-context.service';

/**
 * The one sanctioned way to read/write rows that belong to a single restaurant.
 * Every method is suffixed `...Scoped` so a diff makes it visually obvious
 * whether a given call goes through the tenant filter — a raw `this.repo.find()`
 * elsewhere in a service is then a deliberate, reviewable exception, not a
 * silent one.
 *
 * Rejected alternatives: a TypeORM subscriber/query-hook (raw
 * createQueryBuilder()/find() calls bypass subscribers inconsistently and
 * silently — exactly the failure mode this exists to prevent), and manual
 * per-method `where: { restaurantId }` filters (the copy-paste-and-forget
 * pattern this whole mechanism exists to replace).
 *
 * SUPER_ADMIN (no restaurantId) calling a *Scoped method throws via
 * getRestaurantIdOrThrow() rather than matching nothing or everything.
 * Genuine cross-tenant access must go through a separate, distinctly-named
 * method on the same service that uses `repo` directly, exposed only behind
 * a route marked both @CrossTenant() and @Roles(SUPER_ADMIN).
 *
 * T's restaurantId is typed `string | null` (not just `string`) so this can
 * also back entities like User, whose column is nullable for SUPER_ADMIN
 * rows. This never weakens the guarantee: getRestaurantIdOrThrow() only ever
 * returns a definite string or throws, so every value this class writes or
 * filters by is non-null in practice — the nullability exists purely so the
 * entity's own (correctly nullable) column type satisfies the constraint.
 */
export abstract class TenantScopedBaseService<
  T extends { id: string; restaurantId: string | null },
> {
  constructor(
    protected readonly repo: Repository<T>,
    protected readonly tenantContext: TenantContextService,
  ) {}

  protected scope(): FindOptionsWhere<T> {
    return { restaurantId: this.tenantContext.getRestaurantIdOrThrow() } as FindOptionsWhere<T>;
  }

  async findAllScoped(
    extra?: FindOptionsWhere<T>,
    options?: Omit<FindManyOptions<T>, 'where'>,
  ): Promise<T[]> {
    return this.repo.find({
      ...options,
      where: { ...this.scope(), ...extra },
    });
  }

  async findOneScopedOrFail(id: string): Promise<T> {
    const entity = await this.repo.findOne({
      where: { id, ...this.scope() } as FindOptionsWhere<T>,
    });

    if (!entity) {
      throw new NotFoundException(`${this.repo.metadata.name} with ID ${id} not found`);
    }

    return entity;
  }

  async saveScoped(data: DeepPartial<Omit<T, 'restaurantId'>>): Promise<T> {
    const entity = this.repo.create({
      ...data,
      restaurantId: this.tenantContext.getRestaurantIdOrThrow(),
    } as DeepPartial<T>);
    return this.repo.save(entity);
  }

  async updateScoped(id: string, data: DeepPartial<T>): Promise<T> {
    // 404s before any write if the row exists but belongs to another tenant.
    await this.findOneScopedOrFail(id);
    await this.repo.update({ id, ...this.scope() } as FindOptionsWhere<T>, data as never);
    return this.findOneScopedOrFail(id);
  }

  async softDeleteScoped(id: string): Promise<void> {
    await this.findOneScopedOrFail(id);
    await this.repo.softDelete({ id, ...this.scope() } as FindOptionsWhere<T>);
  }
}
