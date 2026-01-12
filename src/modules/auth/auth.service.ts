import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/users.entity';
import { LoginDto } from './dto/login.dto';
import { LoginResponse } from '../../shared/types/LoginResponse';
import { USER_ROLES } from '@shared/enums/user-roles';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    //get user role
    const role = this.getUserRole(user);
    console.log(role);
    console.log('roles user : ' + role);

    // Generate tokens
    const payload = {
      sub: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      role: role,
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
    };
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
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Generate new tokens
      const newPayload = {
        sub: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
        role: user.role,
      };

      const accessToken = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get('JWT_ACCESS_TOKEN_EXPIRATION') || '1h',
      });

      const newRefreshToken = this.jwtService.sign(newPayload, {
        secret: this.configService.get('JWT_REFRESH_SECRET') || 'refresh-secret-key',
        expiresIn: this.configService.get('JWT_REFRESH_TOKEN_EXPIRATION') || '7d',
      });

      return {
        access_token: accessToken,
        refresh_token: newRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          isAdmin: user.isAdmin,
          role: user.role,
        },
      };
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
    const roleMap: Record<string, USER_ROLES> = {
      super_admin: USER_ROLES.SUPER_ADMIN,
      owner: USER_ROLES.OWNER,
      default: USER_ROLES.OWNER,
    };
    if (user.isAdmin) {
      return roleMap['super_admin'];
    }
    return USER_ROLES.DEFAULT;
  }
}
