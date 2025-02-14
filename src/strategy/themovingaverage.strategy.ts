import { CandleChartResult } from 'binance-api-node';
import _ from 'lodash';
import { rsi, wema } from 'technicalindicators';
import { MarketTrend } from '../common/enums';
import { Trend } from '../common/interface';

export interface MAStrategyResult {
  trend: Trend;
  lastOpenPrice: number;
  lastMA: number[];
  lastRSI: number;
}

export class TheMovingAverageStrategy {
  private candles: CandleChartResult[];
  private periods: number[];

  constructor(
    {
      candles,
      periods,
    }: {
      candles: CandleChartResult[];
      periods: number[];
    } = { candles: [], periods: [] },
  ) {
    this.candles = candles;
    this.periods = periods;
  }

  calculate(): MAStrategyResult {
    const prices = this.candles.map((item) => Number(item.close));
    const maResultList = this.periods.map((period) =>
      wema({ values: prices, period: period }),
    );
    const lastMA = maResultList.map((item) => _.last(item)!);
    const rsiResultList = rsi({ values: prices, period: 14 });
    const lastRSI = _.last(rsiResultList)!;

    const lastOpenPrice = Number(_.last(this.candles)!.open);
    const trend = this.getMarketTrend(
      maResultList,
      rsiResultList,
      lastOpenPrice,
    );

    return { trend, lastOpenPrice, lastMA, lastRSI };
  }

  private getMarketTrend(
    maResultList: number[][],
    rsiList: number[],
    lastOpenPrice: number,
  ): Trend {
    const lastMAValues = maResultList.map((item) => _.last(item)!);
    const lastRSIValue = _.last(rsiList)!;

    const getMaTrend = () => {
      const maTrendValue = lastMAValues.reduce((prev, current, i) => {
        if (!i) return 0;
        if (current == lastMAValues[i - 1]) return prev;
        return prev + (current < lastMAValues[i - 1] ? 1 : -1);
      }, 0);

      if (Math.abs(maTrendValue) !== lastMAValues.length - 1)
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
    if (
      _.isEqual(_.uniq(trends), [MarketTrend.Bearish]) &&
      lastOpenPrice < lastMAValues[0]
    )
      trend = MarketTrend.Bearish;
    if (
      _.isEqual(_.uniq(trends), [MarketTrend.Bullish]) &&
      lastOpenPrice > lastMAValues[0]
    )
      trend = MarketTrend.Bullish;
    return { trend, maTrend, rsiTrend };
  }
}
