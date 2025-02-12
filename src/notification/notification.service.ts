import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import TelegramBot from 'node-telegram-bot-api';

@Injectable()
export class NotificationService {
  private chatId = 0;
  private bot: TelegramBot;
  constructor(private configService: ConfigService) {
    this.bot = new TelegramBot(configService.get('TELEGRAM_BOT_TOKEN'));
    this.chatId = configService.get('TELEGRAM_CHAT_ID');
  }
  simpleNotify(data: Record<any, any>) {
    let message = '';
    for (const key in data) {
      message += `${key}: ${data[key]}\n`;
    }
    return this.bot.sendMessage(this.chatId, message);
  }
}
