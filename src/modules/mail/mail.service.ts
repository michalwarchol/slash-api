import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';

import { TMailResponse } from './mail.dto';

const SENDER_NAME = 'Slash Bot';

@Injectable()
export class MailService {
  private mailerSend: MailerSend;

  constructor(private configService: ConfigService) {
    this.mailerSend = new MailerSend({
      apiKey: this.configService.get<string>('mailersend.apiKey'),
    });
  }

  async sendEmail(to: string, subject: string, html: string): Promise<TMailResponse> {
    const mail = this.configService.get<string>('mailersend.mail');
    const sentFrom = new Sender(mail, SENDER_NAME);
    const recipients = [new Recipient(to, to)];
    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject(subject)
      .setHtml(html);

    return this.mailerSend.email.send(emailParams);
  }
}
