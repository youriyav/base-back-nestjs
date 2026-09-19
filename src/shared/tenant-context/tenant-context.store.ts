import { ClsStore } from 'nestjs-cls';
import { USER_ROLES } from '@shared/enums/user-roles';

/**
 * Per-request tenant context, populated by TenantContextGuard (JWT-authenticated
 * requests) or SlugTenantResolverGuard (public /r/:slug/... routes).
 * restaurantId is null for SUPER_ADMIN and for requests that never resolved a tenant.
 */
export interface AppClsStore extends ClsStore {
  restaurantId: string | null;
  userId?: string;
  role?: USER_ROLES;
  isSuperAdmin?: boolean;
  /** True when restaurantId was resolved from an impersonation claim, not the caller's own account. */
  impersonating?: boolean;
}
