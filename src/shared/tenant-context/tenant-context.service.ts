import { ForbiddenException, Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { USER_ROLES } from '@shared/enums/user-roles';
import { AppClsStore } from './tenant-context.store';

/**
 * Single accessor for the current request's tenant context. Every tenant-scoped
 * service reads the restaurantId through here (never via a manually-passed
 * parameter or a re-decoded JWT) — this is the one choke point that guarantees
 * a request can never accidentally act on a restaurant it wasn't resolved to.
 */
@Injectable()
export class TenantContextService {
  constructor(private readonly cls: ClsService<AppClsStore>) {}

  getRestaurantId(): string | null {
    return this.cls.get('restaurantId') ?? null;
  }

  /**
   * The one choke point every tenant-scoped repository call goes through.
   * Throws rather than silently matching nothing (null) or everything —
   * a SUPER_ADMIN or a context-less caller (e.g. a misused background job)
   * must never fall through into a tenant-scoped query.
   */
  getRestaurantIdOrThrow(): string {
    const restaurantId = this.getRestaurantId();
    if (!restaurantId) {
      throw new ForbiddenException('No tenant context available for this operation');
    }
    return restaurantId;
  }

  getUserId(): string | undefined {
    return this.cls.get('userId');
  }

  getRole(): USER_ROLES | undefined {
    return this.cls.get('role');
  }

  isSuperAdmin(): boolean {
    return this.cls.get('isSuperAdmin') === true;
  }

  /**
   * Internal — only TenantContextGuard and SlugTenantResolverGuard should call this.
   */
  set(store: Partial<AppClsStore>): void {
    if (store.restaurantId !== undefined) this.cls.set('restaurantId', store.restaurantId);
    if (store.userId !== undefined) this.cls.set('userId', store.userId);
    if (store.role !== undefined) this.cls.set('role', store.role);
    if (store.isSuperAdmin !== undefined) this.cls.set('isSuperAdmin', store.isSuperAdmin);
  }
}
