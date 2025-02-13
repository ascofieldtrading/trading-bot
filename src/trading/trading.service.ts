import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import Binance, { CandlesOptions } from 'binance-api-node';
import { CronJob } from 'cron';
import fs from 'fs';
import * as _ from 'lodash';
import { NOTIFICATION_LOG_FILE_PATH } from 'src/common/constant';
import {
  AppConfig,
  NotificationData,
  NotificationLog,
} from 'src/common/interface';
import { NotificationService } from 'src/notification/notification.service';
import { rsi, wema } from 'technicalindicators';
import { MarketTrend } from '../common/enum';

@Injectable()
export class TradingService implements OnModuleInit {
  private readonly logger = new Logger(TradingService.name);
  private client: import('binance-api-node').Binance;

  private notificationLog: NotificationLog = {} as NotificationLog;

  constructor(
    private configService: ConfigService<AppConfig>,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly notificationService: NotificationService,
  ) {
    this.client = Binance({
      apiKey: configService.get('binanceApiKey'),
      apiSecret: configService.get('binanceSecretKey'),
    });
    !this.configService.get('notificationOnStart') &&
      this.loadNotificationLog();
  }

  async onModuleInit() {
    this.logger.verbose(
      `Using cron schedule: ${this.configService.get('scheduledCronValue')}`,
    );

    const job = new CronJob(
      this.configService.get('scheduledCronValue'),
      this.main.bind(this),
    );

    this.schedulerRegistry.addCronJob('dynamicJob', job);
    job.start();
    this.notificationService.simpleNotify([
      'Trading Bot started successfully!',
    ]);
  }

  async main() {
    this.logger.verbose(
      `All intervals: ${this.configService.get('intervals')}`,
    );
    this.configService.get('symbols').forEach((symbol) => {
      this.configService.get('intervals').forEach((interval) => {
        this.theMovingAverageStrategy({
          symbol,
          interval,
        });
      });
    });
  }

  private async theMovingAverageStrategy(candleOptions: CandlesOptions) {
    const candles = await this.getCandles({
      ...candleOptions,
      limit: this.configService.get('fetchPriceLimit'),
    });
    const prices = candles.map((item) => Number(item.open));
    const periods = [21, 50, 200];
    const maResultList = periods.map((period) =>
      wema({ values: prices, period: period }),
    );
    const lastMA = maResultList.map((item) => _.last(item));
    const rsiResultList = rsi({ values: prices, period: 14 });
    const lastRSI = _.last(rsiResultList);

    const trend = this.getMarketTrend(maResultList, rsiResultList);
    const notificationData: NotificationData = {
      symbol: candleOptions.symbol,
      interval: candleOptions.interval,
      lastRSI,
      lastMA: lastMA,
      ...trend,
    };
    await this.handleNotification(notificationData);
  }

  private async handleNotification(data: NotificationData) {
    const lastNotification = this.notificationLog[data.interval]?.[data.symbol];
    const triggerNotificationIfNeeded = async () => {
      if (
        lastNotification &&
        (lastNotification.trend === data.trend ||
          lastNotification.trend === data.maTrend)
      ) {
        this.logger.verbose(
          `Skip notication: ${data.symbol} - ${data.interval}. Market trend: ${data.trend}`,
        );
        return;
      }
      const maValues = data.lastMA.reduce(
        (prev, current, i) => ({ ...prev, [`MA${i + 1}`]: current.toFixed(4) }),
        {},
      );
      const messageObj = {
        Symbol: data.symbol,
        Trend: data.trend,
        Interval: data.interval,
        ...maValues,
        RSI: data.lastRSI,
      };
      await this.notificationService.simpleNotify(messageObj);
      this.logger.verbose(
        `Notified with message: ${JSON.stringify(messageObj, null, 2)}`,
      );
    };

    try {
      await triggerNotificationIfNeeded();
      this.updateAndSaveNotificationLog(data);
    } catch (e) {
      this.logger.error(`Failed to notify and save logs: ${data.interval}`);
    }
  }

  private updateAndSaveNotificationLog(data: NotificationData) {
    _.set(this.notificationLog, `${data.interval}.${data.symbol}`, {
      notifiedAt: new Date().toISOString(),
      ...data,
    });
    fs.writeFileSync(
      NOTIFICATION_LOG_FILE_PATH,
      JSON.stringify(this.notificationLog, null, 2),
      'utf-8',
    );
  }

  private getMarketTrend(maResultList: number[][], rsiList: number[]) {
    const lastValues = maResultList.map((item) => _.last(item));
    const lastRSIValue = _.last(rsiList);

    const getMaTrend = () => {
      const maTrendValue = lastValues.reduce((prev, current, i) => {
        if (!i) return 0;
        if (current == lastValues[i - 1]) return prev;
        return prev + (current < lastValues[i - 1] ? 1 : -1);
      }, 0);

      if (Math.abs(maTrendValue) !== lastValues.length - 1)
        return MarketTrend.Sideway;
      return maTrendValue > 0 ? MarketTrend.Bullish : MarketTrend.Bearish;
    };
    const getRSITrend = () => {
      if (lastRSIValue == 50) return MarketTrend.Sideway;
      return lastRSIValue > 50 ? MarketTrend.Bullish : MarketTrend.Bearish;
    };

    const maTrend = getMaTrend();
    const rsiTrend = getRSITrend();
    let trend = MarketTrend.Sideway;
    const trends = [maTrend, rsiTrend];
    if (_.isEqual(_.uniq(trends), [MarketTrend.Bearish]))
      trend = MarketTrend.Bearish;
    if (_.isEqual(_.uniq(trends), [MarketTrend.Bullish]))
      trend = MarketTrend.Bullish;
    return { trend, maTrend, rsiTrend };
  }

  private getCandles(candleOptions: CandlesOptions) {
    return this.client.candles(candleOptions);
  }

  private loadNotificationLog() {
    const content = fs.readFileSync(NOTIFICATION_LOG_FILE_PATH, 'utf-8');
    this.notificationLog = JSON.parse(content);
  }
}
