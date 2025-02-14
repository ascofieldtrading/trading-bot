import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BotService } from '../bot/bot.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private chatId = 0;
  private notificationEnabled: boolean;

  constructor(
    private configService: ConfigService,
    private botService: BotService,
  ) {
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
        const value = data[key] ? `: ${data[key]}\n` : '';
        message += `${key}${value}`;
      }
      return message;
    };
    return this.botService.sendMessage(this.chatId, getMessage());
  }

  async getUpdates() {
    this.logger.verbose(await this.botService.bot.getUpdates());
  }
}
