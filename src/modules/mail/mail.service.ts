import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';

@Injectable()
export class MailService {
  private mailerSend: MailerSend;

  constructor(private configService: ConfigService) {
    this.mailerSend = new MailerSend({
      apiKey: this.configService.get<string>('MAILERSEND_API_KEY'),
    });
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const sentFrom = new Sender(
      'bot@trial-o65qngkkk2ogwr12.mlsender.net',
      'Slash Bot',
    );

    const recipients = [new Recipient(to, to)];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject(subject)
      .setText('')
      .setHtml(html)

    this.mailerSend.email
      .send(emailParams)
      .then((response) => console.log(response))
      .catch((error) => console.log(error));
  }
}
