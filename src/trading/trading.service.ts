import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Binance from 'binance-api-node';
import * as _ from 'lodash';

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
    const { candles } = await this.getCandles();

    const prices = candles.map((item) => Number(item.open));
    const ma21 = this.smoothedMovingAverage(prices, 21);
    const ma50 = this.smoothedMovingAverage(prices, 50);
    const ma200 = this.smoothedMovingAverage(prices, 200);
    const rsiList = this.calculateRSI(prices);
    const rsi = rsiList[rsiList.length - 1];
    if (ma21 > ma50 && ma50 > ma200 && rsi > 50) {
      console.log('xxx-bull-market looking for long position');
    } else if (ma21 < ma50 && ma50 < ma200 && rsi < 50) {
      console.log('xxx-bear-market looking for short position');
    } else {
      console.log('xxx-sideway-market no trades');
    }
    console.log('xxx', {
      rsi,
      ma21,
      ma50,
      ma200,
    });
  }

  private async getCandles() {
    const candles: any = await this.client.candles({
      symbol: 'SOLUSDT',
      interval: '15m',
      limit: 500,
    });
    const sortedCandles = _.orderBy(candles, ['closeTime'], ['desc']).map(
      (item) => ({
        ...item,
        closeTime: new Date(item.closeTime),
      }),
    );
    return { candles, sortedCandles };
  }

  private smoothedMovingAverage(inputData: number[], period: number): number[] {
    console.log({ length: inputData.length, period });
    if (inputData.length < period) return [];
    const data = inputData.slice(-period);

    const smma: number[] = [];

    // Step 1: Compute the first SMMA (which is the SMA of the first N values)
    const firstSum = data
      .slice(0, period)
      .reduce((sum, value) => sum + value, 0);
    const firstSMMA = firstSum / period;
    smma.push(firstSMMA);

    // Step 2: Compute SMMA for the rest using the recursive formula
    for (let i = period; i < data.length; i++) {
      const prevSMMA = smma[smma.length - 1]; // Previous SMMA value
      const currentSMMA = (prevSMMA * (period - 1) + data[i]) / period;
      smma.push(currentSMMA);
    }

    return smma;
  }

  calculateRSI(data: number[], period: number = 14): number[] {
    if (data.length < period) return [];

    const rsi: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate gains and losses
    for (let i = 1; i < data.length; i++) {
      const change = data[i] - data[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? -change : 0);
    }

    // First Average Gain & Loss (Simple Moving Average)
    let avgGain =
      gains.slice(0, period).reduce((sum, g) => sum + g, 0) / period;
    let avgLoss =
      losses.slice(0, period).reduce((sum, l) => sum + l, 0) / period;

    // Compute RSI for each point in the series
    for (let i = period; i < gains.length; i++) {
      // Smoothed Moving Average for Gains & Losses
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

      // Compute RS and RSI
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsiValue = 100 - 100 / (1 + rs);
      rsi.push(rsiValue);
    }

    return rsi;
  }
}
