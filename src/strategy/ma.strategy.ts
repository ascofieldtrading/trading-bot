import { CandleChartResult } from 'binance-api-node';
import _ from 'lodash';
import { rsi, wema } from 'technicalindicators';
import { MarketTrend } from '../common/enums';
import { Trend } from '../common/interface';

export class MAStrategy {
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

  calculate() {
    const prices = this.candles.map((item) => Number(item.close));
    const maResultList = this.periods.map((period) =>
      wema({ values: prices, period: period }),
    );
    const lastMA = maResultList.map((item) => _.last(item)!);
    const rsiResultList = rsi({ values: prices, period: 14 });
    const lastRSI = _.last(rsiResultList)!;

    const lastOpenPrice = _.last(prices)!;
    const trend = this.getMarketTrend(
      maResultList,
      rsiResultList,
      lastOpenPrice,
    );
    // const lastSideWayPrice =
    //   trend !== MarketTrend.Sideway
    //     ? this.lastSideWay(maResultList, trend.maTrend)
    //     : undefined;

    return { trend, lastOpenPrice, lastMA, lastRSI };
  }

  private getMarketTrend(
    maResultList: number[][],
    rsiList: number[],
    lastOpenPrice: number,
  ): Trend {
    const lastMAValues = maResultList.map((item) => _.last(item)!);
    const lastRSIValue = _.last(rsiList)!;

    const getRSITrend = () => {
      if (lastRSIValue == 50) return MarketTrend.Sideway;
      return lastRSIValue > 50 ? MarketTrend.Bullish : MarketTrend.Bearish;
    };

    const maTrend = this.getMaTrend(lastMAValues);
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
    if (trend !== MarketTrend.Sideway) {
    }
    return { trend, maTrend, rsiTrend };
  }

  private getMaTrend(lastMAValues: number[]) {
    const maTrendValue = lastMAValues.reduce((prev, current, i) => {
      if (!i) return 0;
      if (current == lastMAValues[i - 1]) return prev;
      return prev + (current < lastMAValues[i - 1] ? 1 : -1);
    }, 0);

    if (Math.abs(maTrendValue) !== lastMAValues.length - 1)
      return MarketTrend.Sideway;
    return maTrendValue > 0 ? MarketTrend.Bullish : MarketTrend.Bearish;
  }

  private lastSideWay(maResultList: number[][], trend: MarketTrend) {
    if (trend === MarketTrend.Sideway) {
      const lastMAValues = maResultList.map((item) => _.last(item)!);
      return lastMAValues[0];
    }
    const newList = maResultList.map((item) => item.slice(0, item.length - 1));
    const lastMAValues = newList.map((item) => _.last(item)!);
    return this.lastSideWay(newList, this.getMaTrend(lastMAValues));
  }
}
