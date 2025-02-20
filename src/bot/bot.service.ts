import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CronExpressionParser } from 'cron-parser';
import _ from 'lodash';
import TelegramBot, {
  CallbackQuery,
  Message,
  SendMessageOptions,
} from 'node-telegram-bot-api';
import { AppConfig } from 'src/common/interface';
import { AUTO_DISMISS_MESSAGE_IN_MS } from '../common/constant';
import {
  CallbackCommand,
  Command,
  ConfirmCommand,
  MarketTrend,
} from '../common/enums';
import { Interval } from '../common/types';
import { UserEntity } from '../user/entity/user.entity';
import {
  decodeCallbackCommandData,
  encodeCallbackCommandData,
} from '../util/string';

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
  initQueryCallback(
    callbackCommands: Record<CallbackCommand, CallbackCommandFn>,
  ) {
    this.bot.on('callback_query', (callbackQuery) => {
      const chatId = callbackQuery.message?.chat.id;
      if (!chatId || !callbackQuery.data) return;
      const callbackCommand = decodeCallbackCommandData(callbackQuery.data)[0];
      callbackCommands[callbackCommand]?.(callbackQuery);
    });
  }

  initBotCommands(
    commands: Record<
      Command,
      {
        description: string;
        cb: CommandFn;
      }
    >,
    callbackCommands: Record<CallbackCommand, CallbackCommandFn>,
  ) {
    this.bot.setMyCommands(
      Object.entries(commands).map(([command, { description }]) => ({
        command,
        description,
      })),
    );

    Object.entries(commands).forEach(([command, { cb }]) => {
      this.bot.onText(new RegExp(`\/${command}`), (msg) => cb(msg));
    });

    this.initQueryCallback(callbackCommands);
  }

  async sendMessage(
    chatId: number,
    message: string,
    {
      dismiss = false,
      ...options
    }: SendMessageOptions & { dismiss?: boolean } = {},
  ) {
    try {
      const sentMessage = await this.bot.sendMessage(chatId, message, options);
      dismiss &&
        setTimeout(() => {
          this.bot.deleteMessage(chatId, sentMessage.message_id);
        }, AUTO_DISMISS_MESSAGE_IN_MS);
      return sentMessage;
    } catch (e) {
      this.logger.error(`Failed to sendMessage. Error: ${e}`);
    }
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

  editUserConfigReplyMarkup(user: UserEntity, messageId: number) {
    return this.bot.editMessageReplyMarkup(this.getConfigReplyMarkup(user), {
      chat_id: user.telegramChatId,
      message_id: messageId,
    });
  }

  sendUserConfigs(user: UserEntity) {
    return this.sendMessage(user.telegramChatId, '⚙️ *Config*', {
      parse_mode: 'Markdown',
      reply_markup: this.getConfigReplyMarkup(user),
    });
  }

  async updateUserConfig({
    user,
    cbQuery,
    callbackCommand,
    userSelections,
    defaultValues: defaultOptions = [],
    allOptions,
    multi = true,
    onUpdate,
  }: {
    user: UserEntity;
    cbQuery: CallbackQuery;
    callbackCommand: CallbackCommand;
    userSelections: Record<
      number,
      Partial<Record<CallbackCommand, Set<string>>>
    >;
    defaultValues: string[];
    allOptions: { value: string; label: string }[];
    onUpdate: () => Promise<void>;
    multi?: boolean;
  }) {
    const msg = cbQuery.message!;
    const data = cbQuery.data!;
    const { message } = cbQuery;
    const selectedOption = decodeCallbackCommandData(data)[1];
    const chatId = message!.chat.id;
    const messageId = message!.message_id;

    if (!userSelections[chatId]?.[callbackCommand]) {
      userSelections[chatId] = {
        ...userSelections[chatId],
        [callbackCommand]: new Set<string>(defaultOptions),
      };
    }
    const optionSet = userSelections[chatId][callbackCommand]!;

    if (selectedOption === ConfirmCommand.OK) {
      await onUpdate();
      this.editUserConfigReplyMarkup(user, msg.message_id);
      return;
    }

    const handleSelectedOption = () => {
      if (!selectedOption) return;
      if (optionSet?.has(selectedOption)) {
        if (optionSet.size === 1) {
          this.sendMessage(
            user.telegramChatId,
            'Must keep at least one option!',
            { dismiss: true },
          );
          return;
        }
        optionSet?.delete(selectedOption);
        return;
      }
      optionSet?.add(selectedOption);
    };
    handleSelectedOption();

    const formatOption = (value: string, label: string, chatId: number) => {
      const selectedIcon = multi ? '✅ ' : '';
      return userSelections[chatId][callbackCommand]?.has(value)
        ? `${selectedIcon}${label}`
        : label;
    };

    const options = allOptions.map(({ value, label }) => [
      {
        text: formatOption(value, label, chatId),
        callback_data: encodeCallbackCommandData(callbackCommand, value),
      },
    ]);
    const keyboard = [
      ...options,
      [
        {
          text: 'OK',
          callback_data: encodeCallbackCommandData(
            callbackCommand,
            ConfirmCommand.OK,
          ),
        },
      ],
    ];

    this.bot.editMessageReplyMarkup(
      { inline_keyboard: keyboard },
      { chat_id: chatId, message_id: messageId },
    );

    this.bot.answerCallbackQuery(cbQuery.id);
  }

  private getConfigReplyMarkup(user: UserEntity) {
    const interval = CronExpressionParser.parse(
      this.configService.get('scheduledCronValue')!,
    );
    const [first, second] = interval.take(2);
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
            text: `📈 Looking for trend: ${
              !user.userConfig.lookingForTrend ||
              user.userConfig.lookingForTrend?.split(',').length ===
                Object.values(MarketTrend).length
                ? 'All'
                : _.upperFirst(user.userConfig.lookingForTrend)
            }`,
            callback_data: CallbackCommand.LookingForTrend,
          },
        ],
        [
          {
            text: `⚡Polling signal: ${user.userConfig.pollingSignal ? `Every ${(second.getTime() - first.getTime()) / 1000}s` : 'Disabled'}`,
            callback_data: CallbackCommand.SwitchPollingSignal,
          },
        ],
      ],
    };
  }
}
