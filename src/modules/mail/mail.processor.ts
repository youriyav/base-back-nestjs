import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Job } from 'bullmq';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { MAIL_QUEUE_NAME, MAIL_JOB_NAMES } from './mail.queue';
import { MailJobData, RawMailJobData } from './dto/send-mail.dto';

interface BrevoEmailPayload {
  sender: {
    name: string;
    email: string;
  };
  to: Array<{ email: string; name?: string }>;
  subject: string;
  htmlContent: string;
}

/**
 * Mail Processor (Consumer)
 *
 * Responsibilities:
 * - Process send-email jobs from the mail queue
 * - Load HTML templates and replace variables
 * - Call Brevo API to send emails
 * - Handle retries and failures
 * - Log all operations for debugging
 *
 * This is the ONLY place where Brevo API calls should be made.
 */
@Processor(MAIL_QUEUE_NAME)
export class MailProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(MailProcessor.name);
  private readonly brevoApiUrl = 'https://api.brevo.com/v3/smtp/email';
  private readonly templatesPath: string;

  private apiKey: string;
  private senderEmail: string;
  private senderName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    super();
    this.templatesPath = path.join(__dirname, 'templates');
  }

  onModuleInit(): void {
    this.apiKey = this.configService.get<string>('BREVO_API_KEY') || '';
    this.senderEmail =
      this.configService.get<string>('BREVO_SENDER_EMAIL') || 'no-reply@example.com';
    this.senderName = this.configService.get<string>('BREVO_SENDER_NAME') || 'Application';

    if (!this.apiKey) {
      this.logger.warn('BREVO_API_KEY is not configured. Email sending will fail.');
    } else {
      this.logger.log('MailProcessor initialized successfully');
    }
  }

  /**
   * Main job processor - handles all mail queue jobs
   */
  async process(job: Job<MailJobData | RawMailJobData>): Promise<void> {
    this.logger.log(`Processing job ${job.id} - ${job.name}`);

    switch (job.name) {
      case MAIL_JOB_NAMES.SEND_EMAIL:
        await this.handleSendEmail(job as Job<MailJobData>);
        break;
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  /**
   * Handle send-email job
   */
  private async handleSendEmail(job: Job<MailJobData>): Promise<void> {
    const { to, subject, template, params } = job.data;

    this.logger.debug(`Sending email to ${to} using template: ${template}`);

    // Load and process template
    const htmlContent = await this.loadTemplate(template, params);

    // Send via Brevo API
    await this.sendViaBrevo({
      to,
      subject,
      htmlContent,
    });

    this.logger.log(`Email sent successfully to ${to} using template: ${template}`);
  }

  /**
   * Load and process an HTML template
   */
  private async loadTemplate(
    templateName: string,
    params?: Record<string, string>,
  ): Promise<string> {
    const templatePath = path.join(this.templatesPath, `${templateName}.html`);

    try {
      let htmlContent = await fs.promises.readFile(templatePath, 'utf-8');

      // Replace variables in template
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
          htmlContent = htmlContent.replace(regex, value);
        }
      }

      // Remove any unreplaced variables
      htmlContent = htmlContent.replace(/{{\s*\w+\s*}}/g, '');

      return htmlContent;
    } catch (error) {
      this.logger.error(`Failed to load template: ${templateName}`, error);
      throw new Error(`Email template '${templateName}' not found`);
    }
  }

  /**
   * Send email via Brevo API
   */
  private async sendViaBrevo(options: {
    to: string;
    subject: string;
    htmlContent: string;
  }): Promise<void> {
    if (!this.apiKey) {
      throw new Error('Email service is not configured. Missing BREVO_API_KEY.');
    }

    const payload: BrevoEmailPayload = {
      sender: {
        name: this.senderName,
        email: this.senderEmail,
      },
      to: [{ email: options.to }],
      subject: options.subject,
      htmlContent: options.htmlContent,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(this.brevoApiUrl, payload, {
          headers: {
            'api-key': this.apiKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }),
      );

      this.logger.debug(
        `Brevo API response: ${response.status} - messageId: ${response.data?.messageId}`,
      );
    } catch (error) {
      this.handleBrevoError(error as AxiosError, options.to);
    }
  }

  /**
   * Handle Brevo API errors
   * Throws error to trigger job retry
   */
  private handleBrevoError(error: AxiosError, recipient: string): never {
    const status = error.response?.status;
    const responseData = error.response?.data;

    this.logger.error(
      `Brevo API error sending to ${recipient}`,
      JSON.stringify({
        status,
        message: error.message,
        response: responseData,
      }),
    );

    // Rate limit - should retry
    if (status === 429) {
      throw new Error('Email rate limit exceeded. Will retry.');
    }

    // Auth error - won't fix with retry, but log for debugging
    if (status === 401) {
      throw new Error('Email service authentication failed.');
    }

    // Bad request - log and throw
    if (status === 400) {
      throw new Error(`Invalid email request: ${JSON.stringify(responseData)}`);
    }

    throw new Error(`Failed to send email: ${error.message}`);
  }

  /**
   * Event handler: Job completed
   */
  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.log(`Job ${job.id} completed - Email sent to ${job.data.to}`);
  }

  /**
   * Event handler: Job failed
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `Job ${job.id} failed after ${job.attemptsMade} attempts`,
      `Recipient: ${job.data.to}, Error: ${error.message}`,
    );
  }

  /**
   * Event handler: Job is being retried
   */
  @OnWorkerEvent('error')
  onError(error: Error): void {
    this.logger.error('Worker error:', error.message);
  }
}
