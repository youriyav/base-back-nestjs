import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { USER_ROLES } from '@shared/enums/user-roles';
import { TenantContextService } from '../tenant-context.service';
import { IS_PUBLIC_KEY } from './public.decorator';

interface RequestUser {
  id: string;
  role: USER_ROLES;
  isAdmin: boolean;
  restaurantId: string | null;
  impersonatedRestaurantId?: string | null;
}

/**
 * Populates the tenant context from the authenticated user, once per request.
 * Must run after JwtAuthGuard (so request.user is already set) and before
 * RolesGuard. No-ops on @Public() routes, leaving restaurantId: null.
 */
@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantContext: TenantContextService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;

    if (!user) {
      // No authenticated user (shouldn't happen after JwtAuthGuard on a
      // non-public route, but fail open here — RolesGuard/JwtAuthGuard are
      // responsible for rejecting unauthenticated requests, not this guard).
      return true;
    }

    this.tenantContext.set({
      restaurantId: user.impersonatedRestaurantId ?? user.restaurantId ?? null,
      userId: user.id,
      role: user.role,
      isSuperAdmin: user.isAdmin === true,
      impersonating: !!user.impersonatedRestaurantId,
    });

    return true;
  }
}
