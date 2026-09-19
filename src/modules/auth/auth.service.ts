import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User } from '../users/users.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LoginResponse } from '../../shared/types/LoginResponse';
import { USER_ROLES } from '@shared/enums/user-roles';
import { MailService } from '../mail/mail.service';

/** Token expiration time in minutes */
const TOKEN_EXPIRATION_MINUTES = 15;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['restaurant'],
    });

    if (!user) {
      throw new NotFoundException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueLoginResponse(user);
  }

  /**
   * Mobile login: phone + 4-digit access code instead of email + password.
   * Generic failure message in every case (unknown phone, no access code for
   * this user, or mismatch) — unlike login()'s email lookup, this never
   * distinguishes "not found" from "wrong code" so a caller can't enumerate
   * valid phone numbers.
   */
  async loginWithPhone(phone: string, code: string): Promise<LoginResponse> {
    const user = await this.userRepository.findOne({
      where: { phone },
      relations: ['restaurant'],
    });

    if (!user || !user.accessCode || user.accessCode !== code) {
      throw new UnauthorizedException('Invalid phone number or code.');
    }

    return this.issueLoginResponse(user);
  }

  /**
   * Included for refreshToken()/debuggability, but TenantContextGuard never
   * trusts this claim directly — it's populated from the DB read in
   * JwtStrategy.validate() so a stale token can't assert a stale tenant.
   */
  private issueLoginResponse(user: User): LoginResponse {
    const role = this.getUserRole(user);

    const payload = {
      sub: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      role,
      restaurantId: user.restaurantId ?? null,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_ACCESS_TOKEN_EXPIRATION') || '1h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET') || 'refresh-secret-key',
      expiresIn: this.configService.get('JWT_REFRESH_TOKEN_EXPIRATION') || '7d',
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        isAdmin: user.isAdmin,
        role,
      },
      restaurant: user.restaurant
        ? {
            id: user.restaurant.id,
            name: user.restaurant.name,
            address: user.restaurant.address ?? null,
            phone: user.restaurant.phone ?? null,
          }
        : null,
    };
  }

  /**
   * Mint a short-lived access token letting a SUPER_ADMIN view the app as a
   * given restaurant. The admin's own identity (`sub`, `role`, `restaurantId`)
   * is signed unchanged — only `impersonatedRestaurantId` is added, which
   * TenantContextGuard resolves in preference to the admin's own restaurantId
   * (null). There is no refresh token: an impersonation session is meant to
   * be short and is never silently renewed.
   */
  impersonate(
    admin: Pick<User, 'id' | 'email' | 'isAdmin' | 'role' | 'restaurantId'>,
    restaurantId: string,
  ): { access_token: string } {
    const payload = {
      sub: admin.id,
      email: admin.email,
      isAdmin: admin.isAdmin,
      role: admin.role,
      restaurantId: admin.restaurantId ?? null,
      impersonatedRestaurantId: restaurantId,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_ACCESS_TOKEN_EXPIRATION') || '1h',
    });

    return { access_token: accessToken };
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    try {
      // Verify the refresh token
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET') || 'refresh-secret-key',
      });

      // Get user from database
      const user = await this.userRepository.findOne({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        where: { id: payload.sub },
        relations: ['restaurant'],
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.issueLoginResponse(user);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getProfile(userId: string): Promise<Partial<User>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: [
        'id',
        'email',
        'first_name',
        'last_name',
        'phone',
        'address',
        'isAdmin',
        'role',
        'isActivate',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      address: user.address,
      isAdmin: user.isAdmin,
      role: this.getUserRole(user),
      isActivate: user.isActivate,
    };
  }

  getUserRole(user: User): USER_ROLES {
    if (user.isAdmin) {
      return USER_ROLES.SUPER_ADMIN;
    }
    if (user.role && Object.values(USER_ROLES).includes(user.role)) {
      return user.role;
    }
    return USER_ROLES.DEFAULT;
  }

  /**
   * Generate a password reset token for a user (Admin-triggered)
   * @param userId - The ID of the user to reset password for
   */
  async requestPasswordReset(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Invalidate all previous tokens for this user
    await this.invalidatePreviousTokens(userId);

    // Generate cryptographically secure token
    const plainToken = crypto.randomBytes(32).toString('hex');

    // Hash the token for storage (using SHA-256)
    const tokenHash = this.hashToken(plainToken);

    // Calculate expiration (15 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + TOKEN_EXPIRATION_MINUTES);

    // Store hashed token in database
    const resetToken = this.passwordResetTokenRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    await this.passwordResetTokenRepository.save(resetToken);

    // Send email asynchronously via queue
    await this.mailService.sendPasswordResetEmail(user.email, user.first_name, plainToken);

    this.logger.log(`Password reset token generated for user ${userId}`);
  }

  /**
   * Reset password using a valid token
   * @param resetPasswordDto - Token and new password
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token, newPassword } = resetPasswordDto;

    // Hash the incoming token to compare with stored hash
    const tokenHash = this.hashToken(token);

    // Find valid, unused token
    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: {
        tokenHash,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user'],
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await this.userRepository.update(resetToken.userId, {
      password: hashedPassword,
    });

    // Mark token as used
    await this.passwordResetTokenRepository.update(resetToken.id, {
      usedAt: new Date(),
    });

    // Invalidate all other tokens for this user (security measure)
    await this.invalidatePreviousTokens(resetToken.userId, resetToken.id);

    this.logger.log(`Password reset successful for user ${resetToken.userId}`);
  }

  /**
   * Validate a reset token without using it
   * @param token - The plain reset token
   * @returns boolean - Whether the token is valid
   */
  async validateResetToken(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);

    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: {
        tokenHash,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });

    return !!resetToken;
  }

  /**
   * Hash a token using SHA-256
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Invalidate all previous unused tokens for a user
   */
  private async invalidatePreviousTokens(userId: string, excludeTokenId?: string): Promise<void> {
    const query = this.passwordResetTokenRepository
      .createQueryBuilder()
      .update(PasswordResetToken)
      .set({ usedAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('used_at IS NULL');

    if (excludeTokenId) {
      query.andWhere('id != :excludeTokenId', { excludeTokenId });
    }

    await query.execute();
  }
}
