import { SetMetadata } from '@nestjs/common';

export const CROSS_TENANT_KEY = 'cross_tenant';

/**
 * Marks a route as intentionally cross-tenant (e.g. SUPER_ADMIN listing every
 * restaurant). Use alongside @Roles(USER_ROLES.SUPER_ADMIN) and a distinctly
 * named service method that bypasses TenantScopedBaseService — never combine
 * with a route that also expects TenantContextService.getRestaurantIdOrThrow()
 * to succeed. Grepping @CrossTenant() gives a mechanically verifiable list of
 * every deliberately global route, asserted against an allowlist in the
 * tenant-isolation test suite so an undocumented cross-tenant route can't slip in.
 */
export const CrossTenant = () => SetMetadata(CROSS_TENANT_KEY, true);
