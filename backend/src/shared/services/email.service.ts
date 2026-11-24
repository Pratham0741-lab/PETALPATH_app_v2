/**
 * Outgoing email.
 *
 * One interface, two implementations:
 *  - SES (AWS SDK v3, SESv2), used only when SES_FROM and a region
 *    (SES_REGION, or AWS_REGION) are both set. Credentials come from the
 *    standard AWS chain (the EC2 instance role in production); none are read
 *    here.
 *  - Disabled, used otherwise: `enabled` is false and `send` does nothing, so
 *    a server without mail configured sends nothing at all.
 *
 * Message bodies may contain one-time codes, so nothing here logs a message's
 * content or recipient.
 */
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { env } from '../../config/env.js';

export interface EmailMessage {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
}

export interface EmailService {
  /** False when mail is not configured; callers then skip sending. */
  readonly enabled: boolean;
  send(message: EmailMessage): Promise<void>;
}

export class SesEmailService implements EmailService {
  readonly enabled = true;
  private readonly client: SESv2Client;

  constructor(
    private readonly from: string,
    region: string,
  ) {
    this.client = new SESv2Client({ region });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.client.send(
      new SendEmailCommand({
        FromEmailAddress: this.from,
        Destination: { ToAddresses: [message.to] },
        Content: {
          Simple: {
            Subject: { Data: message.subject, Charset: 'UTF-8' },
            Body: { Text: { Data: message.text, Charset: 'UTF-8' } },
          },
        },
      }),
    );
  }
}

export const disabledEmailService: EmailService = {
  enabled: false,
  async send() {
    /* mail not configured: send nothing */
  },
};

/** SES when SES_FROM and a region are set, otherwise the disabled service. */
export function createEmailService(config: { from?: string; region?: string } = {
  from: env.SES_FROM,
  region: env.SES_REGION ?? env.AWS_REGION,
}): EmailService {
  const from = config.from?.trim();
  const region = config.region?.trim();
  return from && region ? new SesEmailService(from, region) : disabledEmailService;
}

let current: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!current) current = createEmailService();
  return current;
}

/** Tests replace the mailer with a mock; pass null to go back to the default. */
export function setEmailServiceForTests(service: EmailService | null): void {
  current = service;
}
