import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { MailService } from './mail.service';
import { SendMailDto } from './dto/send-mail.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { USER_ROLES } from '@shared/enums/user-roles';
import { ApiResponse } from '@shared/types';

/**
 * Mail Controller - FOR TESTING PURPOSES ONLY
 * This controller should be disabled or protected in production
 *
 * All endpoints now use async queue-based email sending.
 * Emails are queued and processed by BullMQ workers.
 */
@ApiTags('Mail (Testing)')
@ApiBearerAuth()
//@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(USER_ROLES.SUPER_ADMIN) // Only super admin can test emails
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('send')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Queue a test email (SUPER_ADMIN only)',
    description:
      'Queues a test email using a specified template. Email will be processed asynchronously.',
  })
  @ApiOkResponse({ description: 'Email queued successfully' })
  @ApiBadRequestResponse({ description: 'Invalid request data' })
  @ApiForbiddenResponse({ description: 'Access denied' })
  @ApiInternalServerErrorResponse({ description: 'Failed to queue email' })
  async sendTestEmail(@Body() sendMailDto: SendMailDto): Promise<ApiResponse<{ message: string }>> {
    await this.mailService.enqueueMail(sendMailDto);

    return {
      success: true,
      data: { message: 'Email queued successfully. It will be sent shortly.' },
    };
  }

  @Post('test/welcome')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Queue test welcome email (SUPER_ADMIN only)',
    description: 'Queues a test welcome email to verify the template.',
  })
  @ApiOkResponse({ description: 'Welcome email queued successfully' })
  async sendTestWelcomeEmail(
    @Body() body: { email: string; firstName: string },
  ): Promise<ApiResponse<{ message: string }>> {
    await this.mailService.sendWelcomeEmail(body.email, body.firstName);

    return {
      success: true,
      data: { message: 'Welcome email queued successfully' },
    };
  }

  @Post('test/reset-password')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Queue test password reset email (SUPER_ADMIN only)',
    description: 'Queues a test password reset email to verify the template.',
  })
  @ApiOkResponse({ description: 'Password reset email queued successfully' })
  async sendTestResetPasswordEmail(
    @Body() body: { email: string; firstName: string },
  ): Promise<ApiResponse<{ message: string }>> {
    await this.mailService.sendPasswordResetEmail(
      body.email,
      body.firstName,
      'test-reset-token-12345',
    );

    return {
      success: true,
      data: { message: 'Password reset email queued successfully' },
    };
  }

  @Post('test/user-created')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Queue test user created email (SUPER_ADMIN only)',
    description: 'Queues a test user created notification email.',
  })
  @ApiOkResponse({ description: 'User created email queued successfully' })
  async sendTestUserCreatedEmail(
    @Body() body: { email: string; firstName: string },
  ): Promise<ApiResponse<{ message: string }>> {
    await this.mailService.sendUserCreatedEmail(body.email, body.firstName);

    return {
      success: true,
      data: { message: 'User created email queued successfully' },
    };
  }

  @Get('queue/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get mail queue status (SUPER_ADMIN only)',
    description:
      'Returns the current status of the mail queue including pending, active, and failed jobs.',
  })
  @ApiOkResponse({ description: 'Queue status retrieved successfully' })
  async getQueueStatus(): Promise<
    ApiResponse<{
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    }>
  > {
    const status = await this.mailService.getQueueStatus();

    return {
      success: true,
      data: status,
    };
  }
}
