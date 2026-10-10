import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly driver: string;
  private readonly from: string;
  private transporter: Transporter | null = null;
  private readonly logFilePath: string;

  constructor(private readonly config: ConfigService) {
    this.driver = this.config.get<string>('MAIL_DRIVER') ?? 'console';
    this.from =
      this.config.get<string>('MAIL_FROM') ??
      'Porteiro <no-reply@porteiro.local>';

    // Arquivo onde gravamos os emails em dev (para nao depender do tmux)
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    this.logFilePath = path.join(logsDir, 'mail.log');

    if (this.driver === 'smtp') {
      const host = this.config.getOrThrow<string>('SMTP_HOST');
      const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
      const user = this.config.get<string>('SMTP_USER');
      const pass = this.config.get<string>('SMTP_PASS');
      const secure = this.config.get<string>('SMTP_SECURE') === 'true';

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user && pass ? { user, pass } : undefined,
      });

      this.logger.log(`MailService usando driver SMTP (${host}:${port})`);
    } else {
      this.logger.log('MailService usando driver CONSOLE (dev)');
      this.logger.log(`Emails serao gravados em: ${this.logFilePath}`);
    }
  }

  async send({ to, subject, text, html }: SendEmailInput): Promise<void> {
    if (this.driver === 'smtp' && this.transporter) {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        text,
        html,
      });
      this.logger.log(`Email enviado para ${to} (${subject})`);
      return;
    }

    // Driver console: imprime no log E grava em arquivo
    const timestamp = new Date().toISOString();
    const block = [
      '',
      '========================================',
      `  EMAIL (driver console) — ${timestamp}`,
      '========================================',
      `  Para: ${to}`,
      `  De:   ${this.from}`,
      `  Assunto: ${subject}`,
      '----------------------------------------',
      text,
      '========================================',
      '',
    ].join('\n');

    this.logger.log(block);

    // Tambem grava em arquivo (sem quebra de linha artificial)
    fs.appendFileSync(this.logFilePath, block + '\n', 'utf8');
  }
}