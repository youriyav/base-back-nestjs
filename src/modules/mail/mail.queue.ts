/**
 * Mail Queue Constants
 * Defines queue names, job names, and default job options for BullMQ
 */

export const MAIL_QUEUE_NAME = 'mail-queue';

export const MAIL_JOB_NAMES = {
  SEND_EMAIL: 'send-email',
} as const;

export type MailJobName = (typeof MAIL_JOB_NAMES)[keyof typeof MAIL_JOB_NAMES];

/**
 * Default job options for mail queue
 * - 5 retry attempts with exponential backoff
 * - Removes completed jobs to save memory
 * - Keeps failed jobs for debugging
 */
export const DEFAULT_MAIL_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: 'exponential' as const,
    delay: 3000,
  },
  removeOnComplete: true,
  removeOnFail: false,
};
