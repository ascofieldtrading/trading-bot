import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import _ from 'lodash';
import TelegramBot, {
  CallbackQuery,
  Message,
  SendMessageOptions,
} from 'node-telegram-bot-api';
import { AppConfig } from 'src/common/interface';
import { CallbackCommand, Command } from '../common/enums';
import { Interval } from '../common/types';
import { UserEntity } from '../user/entity/user.entity';

type CommandFn = (msg: Message) => void;
type CallbackCommandFn = (cbQuery: CallbackQuery) => Promise<void>;

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
  listenCallback(callbackCommands: Record<CallbackCommand, CallbackCommandFn>) {
    this.bot.on('callback_query', (callbackQuery) => {
      const chatId = callbackQuery.message?.chat.id;
      if (!chatId) return;
      callbackCommands[callbackQuery.data as CallbackCommand]?.(callbackQuery);
    });
  }

  listenCommands(
    commands: Record<Command, CommandFn>,
    callbackCommands: Record<CallbackCommand, CallbackCommandFn>,
  ) {
    const commandDescriptions: Record<Command, string> = {
      [Command.Start]: 'Start to receive coin signal',
      [Command.Status]: 'Show current status of the coins',
      [Command.Config]: 'Set Config',
    };
    this.bot.setMyCommands(
      Object.entries(commandDescriptions).map(([command, description]) => ({
        command,
        description,
      })),
    );

    Object.entries(commands).forEach(([command, cb]) => {
      this.bot.onText(new RegExp(`\/${command}`), (msg) => cb(msg));
    });

    this.listenCallback(callbackCommands);
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
          return;
        }
        await this.sendMultilineMessage(params.user.telegramChatId, [
          `${_.upperFirst(params.name)} invalid`,
        ]);
      },
    );
  }

  editMessageReplyMarkup(user: UserEntity, messageId: number) {
    return this.bot.editMessageReplyMarkup(this.getConfigReplyMarkup(user), {
      chat_id: user.telegramChatId,
      message_id: messageId,
    });
  }

  sendUserConfigs(user: UserEntity) {
    return this.sendMessage(user.telegramChatId, '⚙️ *Config:*', {
      parse_mode: 'Markdown',
      reply_markup: this.getConfigReplyMarkup(user),
    });
  }

  private getConfigReplyMarkup(user: UserEntity) {
    return {
      inline_keyboard: [
        [
          {
            text: `🔔 Notifications: ${user.notificationEnabled ? 'Enabled' : 'Disabled'}`,
            callback_data: CallbackCommand.SwitchNotification,
          },
        ],
        [
          {
            text: `🪙 Symbols: ${user.userConfig.symbols}`,
            callback_data: CallbackCommand.SetSymbols,
          },
        ],
        [
          {
            text: `⏱️ Intervals: ${user.userConfig.intervals}`,
            callback_data: CallbackCommand.SetIntervals,
          },
        ],
        [
          {
            text: `🔄 Reset`,
            callback_data: CallbackCommand.ResetConfig,
          },
        ],
      ],
    };
  }
}
