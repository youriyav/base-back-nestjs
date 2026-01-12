import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ADMIN_ROLES } from '../../../shared/enums/admin-roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<ADMIN_ROLES[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = context.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (user.isAdmin) {
      return true;
      //throw new ForbiddenException('Access denied. Admin privileges required.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!user.role) {
      throw new ForbiddenException('User does not have an assigned  role.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException(`Access denied. Required role(s): ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
