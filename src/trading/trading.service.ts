import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import Binance, { CandlesOptions } from 'binance-api-node';
import { CronJob } from 'cron';
import _ from 'lodash';
import { Message } from 'node-telegram-bot-api';
import { BotService } from '../bot/bot.service';
import {
  COIN_SYMBOLS,
  INTERVALS,
  NEW_USER_DEFAULT_INTERVALS,
  NEW_USER_DEFAULT_SYMBOLS,
} from '../common/constant';
import { AppConfig, MAStrategyResult } from '../common/interface';
import { CoinSymbol, Interval } from '../common/types';
import { NotificationService } from '../notification/notification.service';
import { MAStrategy } from '../strategy/ma.strategy';
import { UserEntity } from '../user/entity/user.entity';
import { UserService } from '../user/user.service';

@Injectable()
export class TradingService implements OnModuleInit {
  private readonly logger = new Logger(TradingService.name);
  private client: import('binance-api-node').Binance;

  constructor(
    private configService: ConfigService<AppConfig>,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly notificationService: NotificationService,
    private readonly botService: BotService,
    private readonly userService: UserService,
  ) {
    this.client = Binance({
      apiKey: configService.get('binanceApiKey'),
      apiSecret: configService.get('binanceSecretKey'),
    });
  }

  async onModuleInit() {
    const command =
      (cb: (msg: Message) => Promise<void>) => async (message: Message) =>
        cb(message).catch(async (e) => {
          this.logger.error(`Failed to resolve user command. Error ${e}`);
          this.notificationService.sendErrorMessage(message.chat.id);
        });
    this.botService.listenCommands({
      onStart: command(async (msg) => {
        const user = await this.userService.createUserIfNotExists(msg);
        await this.userService.enableUserNotification(user);
        await this.notificationService.sendMessageToUser(user, [
          'Started to receive the coin signals',
        ]);
        await this.notificationService.sendUserConfigs(user);
      }),
      onStop: command(async (msg) => {
        const user = await this.userService.createUserIfNotExists(msg);
        await this.userService.disableUserNotification(user);
        await this.notificationService.sendMessageToUser(user, [
          'Stopped to receive the coin signals',
        ]);
      }),
      onStatus: command(async (msg) => {
        const user = await this.userService.createUserIfNotExists(msg);
        await this.checkAndNotifySymbolStatusForUser(user);
      }),
      onUpdateIntervals: command(async (msg) => {
        const user = await this.userService.createUserIfNotExists(msg);
        await this.updateUserFieldConfig({
          name: 'intervals',
          msg,
          user,
          allOptions: INTERVALS,
          onUpdate: async (options) => {
            user.userConfig.intervals = options.join(',');
            await this.userService.update(user);
          },
        });
      }),
      onUpdateSymbols: command(async (msg) => {
        const user = await this.userService.createUserIfNotExists(msg);
        await this.updateUserFieldConfig({
          name: 'symbols',
          msg,
          user,
          allOptions: COIN_SYMBOLS,
          onUpdate: async (options) => {
            user.userConfig.symbols = options.join(',');
            await this.userService.update(user);
          },
        });
      }),
      onResetConfig: command(async (msg) => {
        const user = await this.userService.createUserIfNotExists(msg);
        user.userConfig.symbols = NEW_USER_DEFAULT_SYMBOLS.join(',');
        user.userConfig.intervals = NEW_USER_DEFAULT_INTERVALS.join(',');
        await this.userService.update(user);
        await this.notificationService.sendMessageToUser(user, [
          'Config reset!',
        ]);
        await this.notificationService.sendUserConfigs(user);
      }),
    });

    const initCheckSignalJob = () => {
      this.logger.verbose(
        `Init schedule check and notify - using cron schedule: ${this.configService.get('scheduledCronValue')}`,
      );

      const job = new CronJob(
        this.configService.get('scheduledCronValue')!,
        this.checkAndNotifySymbolStatus.bind(this),
      );

      this.schedulerRegistry.addCronJob('dynamicJob', job);
      job.start();
    };
    initCheckSignalJob();
  }

  async checkAndNotifySymbolStatusForUser(user: UserEntity) {
    this.logger.verbose(
      `All intervals: ${this.configService.get('intervals')}`,
    );
    for (const symbol of user.userConfig.symbols.split(',')) {
      for (const interval of user.userConfig.intervals.split(',')) {
        const result = await this.getMAStrategyResult({
          symbol,
          interval: interval as Interval,
        });
        await this.notificationService.sendSignalStatusToUser(user, result);
      }
    }
  }

  private async checkAndNotifySymbolStatus() {
    this.logger.verbose(
      `All intervals: ${this.configService.get('intervals')}`,
    );
    COIN_SYMBOLS.forEach((symbol) => {
      INTERVALS.forEach(async (interval) => {
        try {
          const result = await this.getMAStrategyResult({
            symbol,
            interval,
          });
          await this.notificationService.sendSignalStautsToUsers(result);
        } catch (e) {
          this.logger.error(
            `${symbol} ${interval}`,
            `Failed to check and notify symbol status. Error ${e}`,
          );
        }
      });
    });
  }

  private async getMAStrategyResult(candleOptions: CandlesOptions) {
    const candles = await this.getCandles({
      ...candleOptions,
      limit: this.configService.get('fetchPriceLimit'),
    });
    const maStrategy = new MAStrategy({
      candles,
      periods: [21, 50, 200],
    });
    const { trend, lastOpenPrice, lastMA, lastRSI } = maStrategy.calculate();

    const result: MAStrategyResult = {
      symbol: candleOptions.symbol as CoinSymbol,
      interval: candleOptions.interval,
      lastOpenPrice,
      lastMA: lastMA,
      lastRSI,
      ...trend,
    };
    return result;
  }

  private getCandles(candleOptions: CandlesOptions) {
    return this.client.candles(candleOptions);
  }

  private async updateUserFieldConfig(params: {
    user: UserEntity;
    name: string;
    msg: Message;
    allOptions: string[];
    onUpdate: (options: string[]) => Promise<void>;
  }) {
    const prompt = await this.notificationService.sendMessageToUser(
      params.user,
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
    this.botService.bot.onReplyToMessage(
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
          await this.notificationService.sendMessageToUser(params.user, [
            `${_.upperFirst(params.name)} updated!`,
          ]);
          await this.notificationService.sendUserConfigs(params.user);
          return;
        }
        await this.notificationService.sendMessageToUser(params.user, [
          `${_.upperFirst(params.name)} invalid`,
        ]);
      },
    );
  }
}
