import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Binance, { CandlesOptions } from 'binance-api-node';
import * as _ from 'lodash';
import { rsi, wema } from 'technicalindicators';

@Injectable()
export class TradingService {
  private client: import('binance-api-node').Binance;

  constructor(private configService: ConfigService) {
    this.client = Binance({
      apiKey: configService.get('BINANCE_API_KEY'),
      apiSecret: configService.get('BINANCE_SECRET_KEY'),
    });
  }

  async main() {
    this.theMovingAverageStrategy({
      symbol: 'SOLUSDT',
      interval: '1h',
      limit: 200,
    });
  }

  private async theMovingAverageStrategy(candleOptions: CandlesOptions) {
    const { candles } = await this.getCandles(candleOptions);

    const prices = candles.map((item) => Number(item.open));

    const wema21Arr = wema({ values: prices, period: 21 });
    const wema50Arr = wema({ values: prices, period: 50 });
    const wema200Arr = wema({ values: prices, period: 200 });
    const rsiArr = rsi({ values: prices, period: 14 });

    const lastRSI = _.last(rsiArr);
    const wema21 = _.last(wema21Arr);
    const wema50 = _.last(wema50Arr);
    const wema200 = _.last(wema200Arr);

    console.log('xxx', { lastRSI, wema21, wema50, wema200 });
  }

  private async getCandles(candleOptions: CandlesOptions) {
    const candles: any = await this.client.candles(candleOptions);
    const sortedCandles = _.orderBy(candles, ['closeTime'], ['desc']).map(
      (item) => ({
        ...item,
        closeTime: new Date(item.closeTime),
      }),
    );
    return { candles, sortedCandles };
  }

  private calculateSmoothedMovingAverage(
    inputData: number[],
    period: number,
  ): number[] {
    if (inputData.length < period) return [];

    const smma: number[] = [];
    let currentSMMA: number | null = null;

    for (let i = 0; i < inputData.length; i++) {
      if (i < period) {
        if (i === period - 1) {
          currentSMMA =
            inputData.slice(0, period).reduce((sum, val) => sum + val, 0) /
            period;
          smma.push(currentSMMA);
        }
      } else {
        currentSMMA = (currentSMMA! * (period - 1) + inputData[i]) / period;
        smma.push(currentSMMA);
      }
    }

    return smma;
  }
}
