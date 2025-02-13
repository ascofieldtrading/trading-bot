import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import Binance, { CandlesOptions } from 'binance-api-node';
import { CronJob } from 'cron';
import fs from 'fs';
import * as _ from 'lodash';
import moment from 'moment';
import { NotificationService } from 'src/notification/notification.service';
import { rsi, wema } from 'technicalindicators';
import { NOTIFICATION_LOG_FILE_PATH } from './constant';
import { MarketTrend } from './enum';
import { NotificationLog, NotificationMessage, Trend } from './interface';
import { Interval } from './type';

@Injectable()
export class TradingService implements OnModuleInit {
  private readonly logger = new Logger(TradingService.name);
  private priceLimit = 500;
  private client: import('binance-api-node').Binance;
  private intervals: Interval[] = ['15m'];
  private notificationLog: NotificationLog = {} as NotificationLog;

  constructor(
    private configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly notificationService: NotificationService,
  ) {
    this.client = Binance({
      apiKey: configService.get('BINANCE_API_KEY'),
      apiSecret: configService.get('BINANCE_SECRET_KEY'),
    });

    const interfalsConfig = configService.get<string>('INTERVALS');
    if (interfalsConfig) {
      this.intervals = interfalsConfig.split(',') as Interval[];
    }

    const notificationOnStart =
      configService.get<string>('NOTIFICATION_ON_START').toLowerCase() ===
      'true';
    if (!notificationOnStart) {
      this.loadNotificationLog();
    }
  }

  async onModuleInit() {
    const cronExpression =
      this.configService.get<string>('SCHEDULED_CRON_VALUE') || '0 * * * * *';
    this.logger.verbose(`Using cron schedule: ${cronExpression}`);

    const job = new CronJob(cronExpression, this.main.bind(this));

    this.schedulerRegistry.addCronJob('dynamicJob', job);
    job.start();
    this.notificationService.simpleNotify([
      'Trading Bot started successfully!',
    ]);
  }

  async main() {
    this.logger.verbose(`All intervals: ${this.intervals}`);
    this.intervals.forEach((interval) => {
      this.theMovingAverageStrategy({
        symbol: 'SOLUSDT',
        interval: interval,
      });
    });
  }

  private async theMovingAverageStrategy(candleOptions: CandlesOptions) {
    const candles = await this.getCandles({
      ...candleOptions,
      limit: this.priceLimit,
    });
    const prices = candles.map((item) => Number(item.open));
    const periods = [21, 50, 200];
    const wemaResultList = periods.map((period) =>
      wema({ values: prices, period: period }),
    );
    const lastWEMA = wemaResultList.map((item) => _.last(item));
    const rsiResultList = rsi({ values: prices, period: 14 });
    const lastRSI = _.last(rsiResultList);

    const trend = this.getMarketTrend(wemaResultList, rsiResultList);
    const messageData: NotificationMessage = {
      interval: candleOptions.interval,
      lastRSI,
      lastWEMA,
      ...trend,
    };
    try {
      await this.handleNotification(messageData);
      this.updateAndSaveNotificationLog(candleOptions.interval, trend);
    } catch (e) {
      this.logger.error(`Failed to notify and save: ${candleOptions.interval}`);
    }
  }

  private async handleNotification(data: NotificationMessage) {
    const lastNotification = this.notificationLog[data.interval];
    const lastNotified = lastNotification
      ? moment(lastNotification.notifiedAt)
      : undefined;

    if (
      lastNotified &&
      (lastNotification.trend === data.trend ||
        lastNotification.trend === data.maTrend)
    ) {
      this.logger.verbose(
        `Skip notication: ${data.interval}. Market trend: ${data.trend}`,
      );
      return;
    }
    const wemaValues = data.lastWEMA.reduce(
      (prev, current, i) => ({ ...prev, [`MA${i + 1}`]: current.toFixed(4) }),
      {},
    );
    await this.notificationService.simpleNotify({
      Interval: data.interval,
      Trend: data.trend,
      ...wemaValues,
      RSI: data.lastRSI,
    });
    this.logger.verbose(
      `Notified with message: ${JSON.stringify(data, null, 2)}`,
    );
  }

  private updateAndSaveNotificationLog(timeFrame: Interval, trend: Trend) {
    this.notificationLog[timeFrame] = {
      notifiedAt: new Date().toISOString(),
      ...trend,
    };
    fs.writeFileSync(
      NOTIFICATION_LOG_FILE_PATH,
      JSON.stringify(this.notificationLog, null, 2),
      'utf-8',
    );
  }

  private getMarketTrend(wemaResultList: number[][], rsiList: number[]) {
    const lastValues = wemaResultList.map((item) => _.last(item));
    const lastRSIValue = _.last(rsiList);

    const getWEMATrend = () => {
      const wemaTrendNumber = lastValues.reduce((prev, current, i) => {
        if (!i) return 0;
        if (current == lastValues[i - 1]) return prev;
        return prev + (current < lastValues[i - 1] ? 1 : -1);
      }, 0);

      if (Math.abs(wemaTrendNumber) !== lastValues.length - 1)
        return MarketTrend.Sideway;
      return wemaTrendNumber > 0 ? MarketTrend.Bullish : MarketTrend.Bearish;
    };
    const getRSITrend = () => {
      if (lastRSIValue == 50) return MarketTrend.Sideway;
      return lastRSIValue > 50 ? MarketTrend.Bullish : MarketTrend.Bearish;
    };

    const maTrend = getWEMATrend();
    const rsiTrend = getRSITrend();
    let trend = MarketTrend.Sideway;
    const trends = [maTrend, rsiTrend];
    if (_.isEqual(_.uniq(trends), [MarketTrend.Bearish]))
      trend = MarketTrend.Bearish;
    if (_.isEqual(_.uniq(trends), [MarketTrend.Bullish]))
      trend = MarketTrend.Bullish;
    return { trend: trend, maTrend, rsiTrend };
  }

  private getCandles(candleOptions: CandlesOptions) {
    return this.client.candles(candleOptions);
  }

  private loadNotificationLog() {
    const content = fs.readFileSync(NOTIFICATION_LOG_FILE_PATH, 'utf-8');
    this.notificationLog = JSON.parse(content);
  }
}
