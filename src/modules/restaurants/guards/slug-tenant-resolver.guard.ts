import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { RestaurantsService } from '../restaurants.service';
import { TenantContextService } from '@shared/tenant-context/tenant-context.service';

interface SlugRequest {
  params: { slug: string };
}

/**
 * Resolves the tenant for public, unauthenticated QR-code menu routes
 * (/r/:slug/menu/...) from the URL slug instead of a JWT. Populates the same
 * CLS store TenantContextGuard would, so downstream tenant-scoped services
 * (findAllScoped, etc.) work identically regardless of how the tenant was
 * resolved.
 */
@Injectable()
export class SlugTenantResolverGuard implements CanActivate {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SlugRequest>();
    // findActiveBySlugOrNotFound throws an identical NotFoundException for
    // "no such slug" and "slug exists but suspended" — deliberately
    // indistinguishable so a probe can't learn whether a restaurant exists.
    const restaurant = await this.restaurantsService.findActiveBySlugOrNotFound(
      request.params.slug,
    );

    this.tenantContext.set({ restaurantId: restaurant.id });
    return true;
  }
}
