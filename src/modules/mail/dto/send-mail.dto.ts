import { IsString, IsEmail, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Interface for mail job data stored in BullMQ queue
 */
export interface MailJobData {
  to: string;
  subject: string;
  template: string;
  params?: Record<string, string>;
}

/**
 * Interface for raw mail job data
 */
export interface RawMailJobData {
  to: string;
  subject: string;
  htmlContent: string;
}

export class SendMailDto {
  @ApiProperty({
    description: 'Recipient email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  to: string;

  @ApiProperty({
    description: 'Email subject',
    example: 'Welcome!',
  })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({
    description: 'Template name (without extension)',
    example: 'welcome',
  })
  @IsString()
  @IsNotEmpty()
  template: string;

  @ApiPropertyOptional({
    description: 'Dynamic variables to replace in template',
    example: { firstName: 'John' },
  })
  @IsObject()
  @IsOptional()
  params?: Record<string, string>;
}

export class SendRawMailDto {
  @ApiProperty({
    description: 'Recipient email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  to: string;

  @ApiProperty({
    description: 'Email subject',
    example: 'Important Notification',
  })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({
    description: 'HTML content of the email',
    example: '<h1>Hello World</h1>',
  })
  @IsString()
  @IsNotEmpty()
  htmlContent: string;
}
