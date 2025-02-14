import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { AppConfig } from 'src/common/interface';

@Injectable()
export class BotService implements OnModuleInit {
  bot: TelegramBot;

  constructor(private configService: ConfigService<AppConfig>) {
    this.bot = new TelegramBot(configService.get('telegramBotToken'), {
      polling: true,
      request: {
        agentOptions: {
          keepAlive: true,
          family: 4,
        },
        url: 'https://api.telegram.org',
      },
    });
  }
  onModuleInit() {}

  listenCommands({
    onStart,
    onStop,
  }: {
    onStart: (msg: Message) => void;
    onStop: (msg: Message) => void;
  }) {
    this.bot.onText(/\/start/, (msg) => onStart(msg));
    this.bot.onText(/\/stop/, (msg) => onStop(msg));
  }

  sendMessage(chatId: number, message: string) {
    return this.bot.sendMessage(chatId, message);
  }
}
