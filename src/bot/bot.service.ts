import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import _ from 'lodash';
import TelegramBot, {
  Message,
  SendMessageOptions,
} from 'node-telegram-bot-api';
import { AppConfig } from 'src/common/interface';
import { Command } from '../common/enums';
import { Interval } from '../common/types';
import { UserEntity } from '../user/entity/user.entity';

type CommandFn = (msg: Message) => void;

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
  bot: TelegramBot;

  constructor(private configService: ConfigService<AppConfig>) {
    this.bot = new TelegramBot(configService.get('telegramBotToken')!, {
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
        command: Command.SetSymbols,
        description: 'Update coin symbols',
      },
      {
        command: Command.SetIntervals,
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
    initCommand(Command.SetSymbols, onUpdateSymbols);
    initCommand(Command.SetIntervals, onUpdateIntervals);
    initCommand(Command.ResetConfig, onResetConfig);
  }

  sendMessage(chatId: number, message: string, options?: SendMessageOptions) {
    return this.bot.sendMessage(chatId, message, options);
  }

  sendMultilineMessage(
    chatId: number,
    data: string[],
    options?: SendMessageOptions,
  ) {
    if (!this.configService.get('notificationEnabled')) {
      this.logger.verbose('Notification is disabled. Skip sending message');
      return;
    }
    return this.sendMessage(chatId, data.join('\n'), options);
  }

  async updateUserFieldConfig(params: {
    user: UserEntity;
    name: string;
    msg: Message;
    allOptions: string[];
    onUpdate: (options: string[]) => Promise<void>;
  }) {
    const prompt = await this.sendMultilineMessage(
      params.user.telegramChatId,
      [
        `Enter your new ${params.name}`,
        '',
        `Supported ${params.name}:`,
        ...params.allOptions.map((val) => `- ${val}`),
      ],
      {
        reply_markup: {
          force_reply: true,
        },
      },
    );
    if (!prompt?.message_id) return;
    this.bot.onReplyToMessage(
      params.msg.chat.id,
      prompt.message_id,
      async (msg) => {
        if (!msg.text) return;
        const newOptionsText = msg.text;
        const newOptions = newOptionsText.split(/,|\n|\s/) as Interval[];
        const isValid =
          _.difference(newOptions, params.allOptions).length === 0;
        if (isValid) {
          await params.onUpdate(newOptions);
          await this.sendMultilineMessage(params.user.telegramChatId, [
            `${_.upperFirst(params.name)} updated!`,
          ]);
          await this.sendUserConfigs(params.user);
          return;
        }
        await this.sendMultilineMessage(params.user.telegramChatId, [
          `${_.upperFirst(params.name)} invalid`,
        ]);
      },
    );
  }

  sendUserConfigs(user: UserEntity) {
    return this.sendMultilineMessage(user.telegramChatId, [
      'Bellow are your configs',
      `Symbols: ${user.userConfig.symbols}`,
      `Intervals: ${user.userConfig.intervals}`,
    ]);
  }
}
