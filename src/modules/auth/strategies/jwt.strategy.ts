import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET') || 'your-secret-key',
    });
  }

  async validate(payload: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      role: this.authService.getUserRole(user),
      // Read from the freshly re-fetched `user` row above, never from the JWT
      // claim itself — a still-valid token must not be able to assert a stale
      // tenant/role after the user is moved between restaurants or demoted.
      restaurantId: user.restaurantId ?? null,
      // Unlike restaurantId above, this genuinely comes from the token: an
      // impersonation grant is a per-token claim, not a DB attribute of the
      // admin user, so there's no DB row to re-derive it from.
      impersonatedRestaurantId: payload.impersonatedRestaurantId ?? null,
    };
  }
}
