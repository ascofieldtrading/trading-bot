import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import Binance, { CandlesOptions } from 'binance-api-node';
import { CronJob } from 'cron';
import _ from 'lodash';
import { Message } from 'node-telegram-bot-api';
import { BotService } from '../bot/bot.service';
import {
  NEW_USER_DEFAULT_INTERVALS,
  NEW_USER_DEFAULT_SYMBOLS,
} from '../common/constant';
import { TimeMeasure } from '../common/decorators';
import { MarketTrend, SignalLogTriggerSource } from '../common/enums';
import { AppConfig, LastSideway, MAStrategyResult } from '../common/interface';
import { CoinSymbol, Interval } from '../common/types';
import { NotificationService } from '../notification/notification.service';
import { SignalLogEntity } from '../signallog/entity/signalog.entity';
import { SignalLogService } from '../signallog/signallog.service';
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
    private readonly signalLogService: SignalLogService,
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
        await this.notifySymbolStatusForUser(user);
      }),
      onUpdateIntervals: command(async (msg) => {
        const user = await this.userService.createUserIfNotExists(msg);
        await this.updateUserFieldConfig({
          name: 'intervals',
          msg,
          user,
          allOptions: this.configService.get('intervals')!,
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
          allOptions: this.configService.get('symbols')!,
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

    await this.checkAndSaveLastSidewayLogs();
    this.initCheckSignalScheduleJob(
      this.configService.get('scheduledCronValue')!,
    );
  }

  @TimeMeasure()
  private initCheckSignalScheduleJob(cronValue: string) {
    this.logger.verbose(
      `Init schedule check and notify - using cron schedule: ${cronValue}`,
    );

    const job = new CronJob(
      cronValue,
      this.checkAndNotifySymbolStatus.bind(this),
    );

    this.schedulerRegistry.addCronJob('dynamicJob', job);
    job.start();
  }

  @TimeMeasure()
  async checkAndSaveLastSidewayLogs() {
    this.configService.get('symbols').forEach((symbol) => {
      this.configService.get('intervals').forEach(async (interval) => {
        try {
          const candles = await this.getCandles({
            symbol,
            interval,
            limit: this.configService.get('fetchPriceLimit'),
          });
          const maStrategy = new MAStrategy({
            candles,
            periods: [21, 50, 200],
          });
          const result = maStrategy.calculateLastMASidewayPrice(candles);
          if (!result) return;
          const maResult: MAStrategyResult = {
            ...result,
            symbol,
            interval,
          };

          const log = new SignalLogEntity({
            interval: maResult.interval,
            symbol: maResult.symbol,
            trend: maResult.trend,
            maTrend: maResult.maTrend,
            lastClosePrice: maResult.lastClosePrice,
            lastCloseAt: maResult.lastCloseTime,
            triggerSource: SignalLogTriggerSource.AppStart,
            data: maResult,
          });

          await this.signalLogService.saveAppStartLogIfNotExists(log);
        } catch (e) {
          this.logger.error(
            `${symbol} ${interval}`,
            `Failed to update last sideway. Error ${e}`,
          );
        }
      });
    });
  }

  async notifySymbolStatusForUser(user: UserEntity) {
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
    this.configService.get('symbols').forEach((symbol) => {
      this.configService.get('intervals').forEach(async (interval) => {
        try {
          const result = await this.getMAStrategyResult({
            symbol,
            interval,
          });
          await this.notificationService.sendSignalStatusToUsers(result);
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
    const strategyResult = maStrategy.calculate();

    const result: MAStrategyResult = {
      symbol: candleOptions.symbol as CoinSymbol,
      interval: candleOptions.interval,
      ...strategyResult,
    };
    result.lastSideway =
      result.trend !== MarketTrend.Sideway
        ? await this.getLastMASideway(result)
        : undefined;

    return result;
  }

  private async getLastMASideway(
    data: MAStrategyResult,
  ): Promise<LastSideway | undefined> {
    const signalLog = await this.signalLogService.getLastMASideway({
      interval: data.interval,
      symbol: data.symbol,
    });
    if (!signalLog) return undefined;
    return {
      close: signalLog.lastClosePrice,
      closeTime: signalLog.lastCloseAt,
    };
  }

  private getCandles(candleOptions: CandlesOptions) {
    return this.client.candles({
      ...candleOptions,
    });
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
