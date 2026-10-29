export const MAIL_QUEUE = 'mail';

export enum MailJob {
  WELCOME = 'welcome',
}

export interface WelcomeMailData {
  email: string;
  firstName: string;
}
