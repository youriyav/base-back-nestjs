import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';
import { MailProcessor } from './mail.processor';
import { MAIL_QUEUE_NAME } from './mail.queue';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 10000, // 10 seconds timeout for Brevo API
      maxRedirects: 5,
    }),
    // Register the mail queue for BullMQ
    BullModule.registerQueue({
      name: MAIL_QUEUE_NAME,
    }),
  ],
  controllers: [MailController],
  providers: [
    MailService, // Producer - enqueues emails
    MailProcessor, // Consumer - processes queue and sends via Brevo
  ],
  exports: [MailService],
})
export class MailModule {}
