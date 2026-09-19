import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'is_public';

/**
 * Marks a route as not requiring authentication. Required on every
 * intentionally-unauthenticated route now that JwtAuthGuard/TenantContextGuard
 * are registered globally (default-deny) — a route with neither @Public() nor
 * a valid token gets a 401, so a forgotten guard on a new module fails loudly
 * instead of silently leaking data.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
