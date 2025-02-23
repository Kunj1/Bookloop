export interface EmailOptions {
    subject: string;
    text: string;
    html?: string;
    attachments?: Array<{
      filename: string;
      content: Buffer | string;
      contentType?: string;
    }>;
}

export interface TemplatedEmailData {
  [key: string]: any;
}

export type NotificationType = 'email' | 'sms' | 'push';

export interface NotificationPayload {
  type: NotificationType;
  recipient: string;
  template?: string;
  emailOptions?: EmailOptions;  // Added this for direct email sending
  data?: TemplatedEmailData;
}