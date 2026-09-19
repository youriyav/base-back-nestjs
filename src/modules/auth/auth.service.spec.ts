import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { User } from '../users/users.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { MailService } from '../mail/mail.service';
import { USER_ROLES } from '@shared/enums/user-roles';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    jwtService = { sign: jest.fn().mockReturnValue('signed.jwt.token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(PasswordResetToken), useValue: {} },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
        { provide: MailService, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('impersonate', () => {
    const admin = {
      id: 'admin-1',
      email: 'admin@admin.com',
      isAdmin: true,
      role: USER_ROLES.SUPER_ADMIN,
      restaurantId: null,
    };

    it('signs a token carrying the admin identity plus the impersonated restaurant', () => {
      const result = service.impersonate(admin, 'restaurant-42');

      expect(result).toEqual({ access_token: 'signed.jwt.token' });
      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          sub: admin.id,
          email: admin.email,
          isAdmin: true,
          role: USER_ROLES.SUPER_ADMIN,
          restaurantId: null,
          impersonatedRestaurantId: 'restaurant-42',
        },
        expect.objectContaining({ expiresIn: expect.anything() }),
      );
    });

    it('preserves the admin own restaurantId (null) rather than the impersonated one', () => {
      service.impersonate(admin, 'restaurant-42');

      const [signedPayload] = jwtService.sign.mock.calls[0];
      expect(signedPayload.restaurantId).toBeNull();
      expect(signedPayload.impersonatedRestaurantId).toBe('restaurant-42');
    });
  });

  describe('getUserRole', () => {
    it('is always SUPER_ADMIN when isAdmin is true, regardless of the stored role', () => {
      expect(service.getUserRole({ isAdmin: true, role: USER_ROLES.CASHIER } as User)).toBe(
        USER_ROLES.SUPER_ADMIN,
      );
      expect(service.getUserRole({ isAdmin: true, role: undefined } as unknown as User)).toBe(
        USER_ROLES.SUPER_ADMIN,
      );
    });

    it.each(Object.values(USER_ROLES))(
      'passes through role %s unchanged when isAdmin is false',
      (role) => {
        expect(service.getUserRole({ isAdmin: false, role } as User)).toBe(role);
      },
    );

    it('falls back to DEFAULT when role is missing', () => {
      expect(service.getUserRole({ isAdmin: false, role: undefined } as unknown as User)).toBe(
        USER_ROLES.DEFAULT,
      );
      expect(service.getUserRole({ isAdmin: false, role: null } as unknown as User)).toBe(
        USER_ROLES.DEFAULT,
      );
    });
  });
});
