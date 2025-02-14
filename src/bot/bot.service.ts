import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import TelegramBot, {
  Message,
  SendMessageOptions,
} from 'node-telegram-bot-api';
import { AppConfig } from 'src/common/interface';
import { Command } from '../common/enums';

type CommandFn = (msg: Message) => void;

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
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

  listenCommands({
    onStart,
    onStop,
    onStatus,
    onUpdateSymbols,
    onUpdateIntervals,
    onResetConfig,
  }: {
    onStart: CommandFn;
    onStop: CommandFn;
    onStatus: CommandFn;
    onUpdateSymbols: CommandFn;
    onUpdateIntervals: CommandFn;
    onResetConfig: CommandFn;
  }) {
    this.bot.setMyCommands([
      {
        command: Command.Start,
        description: 'Start to receive coin signal',
      },
      {
        command: Command.Stop,
        description: 'Stop to receive coin signal',
      },
      {
        command: Command.Status,
        description: 'Show current status of the coins',
      },
      {
        command: Command.UpdateSymbols,
        description: 'Update coin symbols',
      },
      {
        command: Command.UpdateIntervals,
        description: 'Update interval',
      },
      {
        command: Command.ResetConfig,
        description: 'Reset config',
      },
    ]);

    const initCommand = (name: string, cb: CommandFn) =>
      this.bot.onText(new RegExp(`\/${name}`), (msg) => cb(msg));
    initCommand(Command.Start, onStart);
    initCommand(Command.Stop, onStop);
    initCommand(Command.Status, onStatus);
    initCommand(Command.UpdateSymbols, onUpdateSymbols);
    initCommand(Command.UpdateIntervals, onUpdateIntervals);
    initCommand(Command.ResetConfig, onResetConfig);
  }

  sendMessage(chatId: number, message: string, options?: SendMessageOptions) {
    return this.bot.sendMessage(chatId, message, options);
  }

  simpleNotify(chatId: number, data: string[], options?: SendMessageOptions) {
    if (!this.configService.get('notificationEnabled')) {
      this.logger.verbose('Notification is disabled. Skip sending message');
      return;
    }
    return this.sendMessage(chatId, data.join('\n'), options);
  }
}
