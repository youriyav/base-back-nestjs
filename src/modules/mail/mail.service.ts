import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { MAIL_QUEUE_NAME, MAIL_JOB_NAMES, DEFAULT_MAIL_JOB_OPTIONS } from './mail.queue';
import { MailJobData, SendMailDto } from './dto/send-mail.dto';

/**
 * Mail Service (Producer)
 *
 * Responsibilities:
 * - Add email jobs to the mail queue
 * - Provide convenience methods for common email types
 * - Fast return without waiting for email delivery
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @InjectQueue(MAIL_QUEUE_NAME) private readonly mailQueue: Queue<MailJobData>,
    private readonly configService: ConfigService,
  ) {
    this.logger.log('MailService (Producer) initialized');
  }

  /**
   * Enqueue an email to be sent asynchronously
   * @param dto - Email data (to, subject, template, params)
   * @returns Promise that resolves immediately after job is queued
   */
  async enqueueMail(dto: SendMailDto): Promise<void> {
    const jobData: MailJobData = {
      to: dto.to,
      subject: dto.subject,
      template: dto.template,
      params: dto.params,
    };

    const job = await this.mailQueue.add(
      MAIL_JOB_NAMES.SEND_EMAIL,
      jobData,
      DEFAULT_MAIL_JOB_OPTIONS,
    );

    this.logger.debug(`Email job queued: ${job.id} - to: ${dto.to}, template: ${dto.template}`);
  }

  /**
   * Enqueue welcome email for a new user
   * @param email - User's email address
   * @param firstName - User's first name
   */
  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    await this.enqueueMail({
      to: email,
      subject: 'Bienvenue!',
      template: 'welcome',
      params: {
        firstName,
        appName: this.configService.get<string>('APP_NAME') || 'Application',
        loginUrl: this.configService.get<string>('APP_URL') || 'http://localhost:3000/login',
      },
    });

    this.logger.log(`Welcome email queued for ${email}`);
  }

  /**
   * Enqueue password reset email
   * @param email - User's email address
   * @param firstName - User's first name
   * @param resetToken - Password reset token
   */
  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetToken: string,
  ): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

    await this.enqueueMail({
      to: email,
      subject: 'Reinitialisation de votre mot de passe',
      template: 'reset-password',
      params: {
        firstName,
        resetLink,
        expirationTime: '15 minutes',
      },
    });

    this.logger.log(`Password reset email queued for ${email}`);
  }

  /**
   * Enqueue user created notification email
   * @param email - User's email address
   * @param firstName - User's first name
   * @param tempPassword - Temporary password (optional)
   */
  async sendUserCreatedEmail(
    email: string,
    firstName: string,
    tempPassword?: string,
  ): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';

    await this.enqueueMail({
      to: email,
      subject: 'Votre compte a ete cree',
      template: 'user-created',
      params: {
        firstName,
        appName: this.configService.get<string>('APP_NAME') || 'Application',
        loginUrl: `${appUrl}/login`,
        tempPassword: tempPassword || '',
        hasTempPassword: tempPassword ? 'true' : 'false',
      },
    });

    this.logger.log(`User created email queued for ${email}`);
  }

  /**
   * Get queue health status
   * @returns Queue metrics for monitoring
   */
  async getQueueStatus(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.mailQueue.getWaitingCount(),
      this.mailQueue.getActiveCount(),
      this.mailQueue.getCompletedCount(),
      this.mailQueue.getFailedCount(),
      this.mailQueue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }
}
