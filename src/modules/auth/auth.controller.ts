import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from './decorators/user.decorator';
import { User as UserEntity } from '@modules/users/users.entity';
import { ApiResponse as CustomApiResponse, LoginResponse } from '@shared/types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({
    status: 200,
    description: 'Login successful. Returns access token and refresh token.',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        refresh_token: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            isAdmin: { type: 'boolean' },
            role: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async login(@Body() loginDto: LoginDto): Promise<CustomApiResponse<LoginResponse>> {
    const data = await this.authService.login(loginDto);
    return {
      success: true,
      data: data,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully. Returns new access token and refresh token.',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        refresh_token: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            isAdmin: { type: 'boolean' },
            role: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token.' })
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<CustomApiResponse<LoginResponse>> {
    const data = await this.authService.refreshToken(refreshTokenDto.refresh_token);
    return {
      success: true,
      data: data,
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Returns current user profile.',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        phone: { type: 'string' },
        address: { type: 'string' },
        isAdmin: { type: 'boolean' },
        role: { type: 'string' },
        isActivate: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getProfile(
    @User() user: Partial<UserEntity>,
  ): Promise<CustomApiResponse<Partial<UserEntity>>> {
    if (user.id) {
      const data = await this.authService.getProfile(user.id);
      return {
        success: true,
        data: data,
      };
    }
    throw new UnauthorizedException('Invalid user');
  }
}
