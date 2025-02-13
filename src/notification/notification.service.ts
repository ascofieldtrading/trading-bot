import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import TelegramBot from 'node-telegram-bot-api';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private chatId = 0;
  private bot: TelegramBot;
  private notificationEnabled: boolean;

  constructor(private configService: ConfigService) {
    this.bot = new TelegramBot(configService.get('TELEGRAM_BOT_TOKEN'));
    this.chatId = configService.get('TELEGRAM_CHAT_ID');
    this.notificationEnabled =
      configService.get<string>('NOTIFICATION_ENABLED').toLowerCase() ===
      'true';
  }

  simpleNotify(data: Record<any, any> | string[]) {
    if (!this.notificationEnabled) {
      this.logger.verbose('Notification is disabled. Skip sending message');
      return;
    }
    const getMessage = () => {
      let message = '';
      if (Array.isArray(data)) {
        data.forEach((val) => {
          message += `${val}\n`;
        });
        return message;
      }
      for (const key in data) {
        message += `${key}: ${data[key]}\n`;
      }
      return message;
    };
    return this.bot.sendMessage(this.chatId, getMessage());
  }
}
