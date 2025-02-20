import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import Binance, { CandlesOptions } from 'binance-api-node';
import { CronJob } from 'cron';
import _ from 'lodash';
import { CallbackQuery, Message } from 'node-telegram-bot-api';
import { BotService } from '../bot/bot.service';
import { MA_PERIODS } from '../common/constant';
import { TimeMeasure } from '../common/decorators';
import {
  CallbackCommand,
  Command,
  MarketTrend,
  SignalLogTriggerSource,
} from '../common/enums';
import { AppConfig, MAStrategyResult } from '../common/interface';
import { CoinSymbol, Interval } from '../common/types';
import { getMockSidewayStrategyResult } from '../dummy';
import { NotificationService } from '../notification/notification.service';
import { SignalLogEntity } from '../signallog/entity/signalog.entity';
import { SignalLogService } from '../signallog/signallog.service';
import { MAStrategy } from '../strategy/ma.strategy';
import { TradingService } from '../trading/trading.service';
import { UserEntity } from '../user/entity/user.entity';
import { UserService } from '../user/user.service';

@Injectable()
export class SignalService implements OnModuleInit {
  userSelections: Record<
    number,
    Partial<Record<CallbackCommand, Set<string>>>
  > = {}; // Store user selections

  private readonly logger = new Logger(SignalService.name);
  private client: import('binance-api-node').Binance;

  constructor(
    private configService: ConfigService<AppConfig>,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly notificationService: NotificationService,
    private readonly botService: BotService,
    private readonly userService: UserService,
    private readonly signalLogService: SignalLogService,
    private readonly tradingService: TradingService,
  ) {
    this.client = Binance({
      apiKey: configService.get('binanceApiKey'),
      apiSecret: configService.get('binanceSecretKey'),
    });
  }

  @TimeMeasure()
  async fakeNotifyStatusForUser(user: UserEntity) {
    const result = getMockSidewayStrategyResult();
    const lastSignalLog = await this.signalLogService.getLatestUserLog(
      user.telegramUserId,
      {
        interval: result.interval,
        symbol: result.symbol,
        notified: true,
      },
    );
    if (!lastSignalLog) return;
    const shouldNotify = this.notificationService.shouldNotifyUser(
      result,
      lastSignalLog.data,
    );
    if (!shouldNotify) return;
    await this.notificationService.sendStatusToUser(user, result);
  }

  async onModuleInit() {
    // const user = await this.userService.getUserByTelegramUserId(
    //   TEST_USER_TELEGRAM_ID,
    // );
    // if (user)
    //   this.tradingService.placeTestOrder({
    //     user: user,
    //     symbol: 'SOLUSDT',
    //     price: 173.4,
    //     margin: 100,
    //     side: OrderSide.Long,
    //     leverage: 10,
    //   });
    // return;
    await this.checkAndSaveLastSidewayLogs();
    this.initBotCommand();
    this.initCheckSignalScheduleJob(
      this.configService.get('scheduledCronValue')!,
    );
  }

  private initBotCommand() {
    const command =
      (cb: (msg: Message) => Promise<void>) => async (message: Message) =>
        cb(message).catch(async (e) => {
          this.logger.error(`Failed to resolve user command. Error ${e}`);
          this.notificationService.sendErrorMessage(message.chat.id);
        });
    const callbackCommand =
      (cb: (cbQuery: CallbackQuery) => Promise<void>) =>
      async (callbackQuery: CallbackQuery) => {
        if (!callbackQuery.message) return;
        cb.bind(this, callbackQuery)().catch(async (e) => {
          if (!callbackQuery.message || !callbackQuery.data) return;
          this.logger.error(`Failed to resolve user command. Error ${e}`);
          this.notificationService.sendErrorMessage(
            callbackQuery.message?.chat.id,
          );
        });
      };
    this.botService.initBotCommands(
      {
        [Command.Start]: {
          description: 'Start to receive coin signal',
          cb: command(async (msg) => {
            const user = await this.userService.createUserIfNotExists(msg);
            await this.userService.enableUserNotification(user);
            await this.botService.sendUserConfigs(user);
          }),
        },
        [Command.Status]: {
          description: 'Show status',
          cb: command(async (msg) => {
            const user = await this.userService.createUserIfNotExists(msg);
            await this.notifyStatusForUser(user);
          }),
        },
      },
      {
        [CallbackCommand.SetIntervals]: callbackCommand(async (cbQuery) => {
          const msg = cbQuery.message!;
          const user = await this.userService.createUserIfNotExists(msg);
          this.botService.updateUserConfig({
            cbQuery,
            user,
            callbackCommand: CallbackCommand.SetIntervals,
            userSelections: this.userSelections,
            allOptions: this.configService
              .get('intervals')!
              .map((value) => ({ value, label: value })),
            defaultValues: user.userConfig.intervals.split(','),
            onUpdate: async () => {
              user.userConfig.intervals = Array.from(
                this.userSelections[user.telegramChatId][
                  CallbackCommand.SetIntervals
                ]!,
              ).join(',');
              await this.userService.update(user);
            },
          });
        }),
        [CallbackCommand.SetSymbols]: callbackCommand(
          async (cbQuery: CallbackQuery) => {
            const msg = cbQuery.message!;
            const user = await this.userService.createUserIfNotExists(msg);
            this.botService.updateUserConfig({
              cbQuery,
              user,
              callbackCommand: CallbackCommand.SetSymbols,
              userSelections: this.userSelections,
              allOptions: this.configService
                .get('symbols')!
                .map((value) => ({ value, label: value })),
              defaultValues: user.userConfig.symbols.split(','),
              onUpdate: async () => {
                user.userConfig.symbols = Array.from(
                  this.userSelections[user.telegramChatId][
                    CallbackCommand.SetSymbols
                  ]!,
                ).join(',');
                await this.userService.update(user);
              },
            });
          },
        ),
        [CallbackCommand.LookingForTrend]: callbackCommand(
          async (cbQuery: CallbackQuery) => {
            const msg = cbQuery.message!;
            const user = await this.userService.createUserIfNotExists(msg);
            this.botService.updateUserConfig({
              cbQuery,
              user,
              callbackCommand: CallbackCommand.LookingForTrend,
              userSelections: this.userSelections,
              allOptions: Object.values(MarketTrend).map((value) => ({
                value,
                label: _.upperFirst(value),
              })),
              defaultValues:
                user.userConfig.lookingForTrend?.split(',') ??
                Object.values(MarketTrend),
              onUpdate: async () => {
                user.userConfig.lookingForTrend = Array.from(
                  this.userSelections[user.telegramChatId][
                    CallbackCommand.LookingForTrend
                  ]!,
                ).join(',');
                await this.userService.update(user);
              },
            });
          },
        ),
        [CallbackCommand.SwitchNotification]: callbackCommand(
          async (cbQuery: CallbackQuery) => {
            const msg = cbQuery.message!;
            const user = await this.userService.createUserIfNotExists(msg);
            await this.userService.switchNotification(user);
            this.botService.editUserConfigReplyMarkup(user, msg.message_id);
          },
        ),
        [CallbackCommand.SwitchPollingSignal]: callbackCommand(
          async (cbQuery: CallbackQuery) => {
            const msg = cbQuery.message!;
            const user = await this.userService.createUserIfNotExists(msg);
            await this.userService.switchPollingSignal(user);
            this.botService.editUserConfigReplyMarkup(user, msg.message_id);
          },
        ),
      },
    );
  }

  @TimeMeasure()
  private initCheckSignalScheduleJob(cronValue: string) {
    this.logger.verbose(
      `Init schedule check and notify - using cron schedule: ${cronValue}`,
      `Symbols: ${this.configService.get('symbols')}`,
      `Intervals: ${this.configService.get('intervals')}`,
    );

    const job = new CronJob(cronValue, this.checkAndNotifyStatus.bind(this));

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
            periods: MA_PERIODS,
          });
          const result = maStrategy.calculateLastMASideway(candles);
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

  @TimeMeasure()
  async notifyStatusForUser(user: UserEntity) {
    for (const symbol of user.userConfig.symbols.split(',')) {
      for (const interval of user.userConfig.intervals.split(',')) {
        const result = await this.getMAStrategyResult({
          symbol,
          interval: interval as Interval,
        });
        await this.notificationService.sendStatusToUser(user, result);
      }
    }
  }

  @TimeMeasure()
  private async checkAndNotifyStatus() {
    const promiseList = this.configService
      .get<CoinSymbol[]>('symbols')!
      .map((symbol) =>
        this.configService
          .get<Interval[]>('intervals')!
          .map(async (interval) => {
            try {
              const result = await this.getMAStrategyResult({
                symbol,
                interval,
              });
              await this.notificationService.sendStatusToUsers(result);
            } catch (e) {
              this.logger.error(
                `${symbol} ${interval}`,
                `Failed to check and notify symbol status. Error ${e}`,
              );
            }
          }),
      );
    await Promise.all(promiseList.flat());
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

    if (result.trend !== MarketTrend.Sideway) {
      const sidewayLog = await this.signalLogService.getLastMASideway({
        interval: candleOptions.interval,
        symbol: candleOptions.symbol as CoinSymbol,
      });
      if (sidewayLog) {
        result.lastSideway = {
          close: sidewayLog.lastClosePrice,
          closeTime: sidewayLog.lastCloseAt,
        };
      }
    }

    return result;
  }

  private getCandles(candleOptions: CandlesOptions) {
    return this.client.candles(candleOptions);
  }
}
