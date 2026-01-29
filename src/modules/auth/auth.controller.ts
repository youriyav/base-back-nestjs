import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  Query,
  UseGuards,
  UnauthorizedException,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { User } from './decorators/user.decorator';
import { User as UserEntity } from '@modules/users/users.entity';
import { USER_ROLES } from '@shared/enums/user-roles';
import { ApiResponse as CustomApiResponse, LoginResponse } from '@shared/types';
import { Audit } from '@modules/audit-logs/decorators';
import { AUTH_ACTIONS, AUDIT_ENTITIES } from '@modules/audit-logs/constants';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Audit({ action: AUTH_ACTIONS.LOGIN, entity: AUDIT_ENTITIES.AUTH })
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
  @Audit({ action: AUTH_ACTIONS.REFRESH_TOKEN, entity: AUDIT_ENTITIES.AUTH })
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

  /**
   * Admin-triggered password reset
   * Generates a reset token and sends email to user
   */
  @Post('admin/users/:id/reset-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.OWNER)
  @Audit({ action: AUTH_ACTIONS.REQUEST_PASSWORD_RESET, entity: AUDIT_ENTITIES.USER })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger password reset for a user (Admin only)',
    description:
      'Generates a password reset token and sends an email to the user. Only SUPER_ADMIN and OWNER roles can access this endpoint.',
  })
  @ApiParam({ name: 'id', description: 'User ID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Password reset email sent successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async requestPasswordReset(
    @Param('id', ParseUUIDPipe) userId: string,
  ): Promise<CustomApiResponse<{ message: string }>> {
    await this.authService.requestPasswordReset(userId);

    return {
      success: true,
      data: { message: 'Password reset email sent successfully' },
    };
  }

  /**
   * Public endpoint - Reset password with token
   * User clicks link from email and submits new password
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Audit({ action: AUTH_ACTIONS.RESET_PASSWORD, entity: AUDIT_ENTITIES.AUTH })
  @ApiOperation({
    summary: 'Reset password with token',
    description:
      'Resets user password using the token received via email. Token must be valid and not expired.',
  })
  @ApiResponse({ status: 200, description: 'Password reset successful.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token.' })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<CustomApiResponse<{ message: string }>> {
    await this.authService.resetPassword(resetPasswordDto);

    return {
      success: true,
      data: { message: 'Password reset successful. You can now login with your new password.' },
    };
  }

  /**
   * Validate reset token (optional - for frontend to check before showing form)
   */
  @Get('reset-password/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate password reset token',
    description:
      'Checks if a password reset token is valid and not expired. Use before showing the reset form.',
  })
  @ApiQuery({ name: 'token', description: 'Password reset token', type: 'string' })
  @ApiResponse({ status: 200, description: 'Token validation result.' })
  async validateResetToken(
    @Query('token') token: string,
  ): Promise<CustomApiResponse<{ valid: boolean }>> {
    const valid = await this.authService.validateResetToken(token);

    return {
      success: true,
      data: { valid },
    };
  }
}
