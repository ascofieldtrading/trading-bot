import { CandleChartResult } from 'binance-api-node';
import _ from 'lodash';
import { rsi, wema } from 'technicalindicators';
import { MarketTrend } from '../common/enums';
import { StrategyResult, Trend } from '../common/interface';

interface IndicatorParams {
  closePrices: number[];
  maResultList: number[][];
  rsiResultList: number[];
  lastClosePrice: number;
  lastCloseTime: Date;
}

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

  private getIndicatorParams(candles: CandleChartResult[]): IndicatorParams {
    const closePrices = candles.map((item) => Number(item.close));
    const maResultList = this.periods.map((period) =>
      wema({ values: closePrices, period: period }),
    );
    const rsiResultList = rsi({ values: closePrices, period: 14 });
    const lastClosePrice = _.last(closePrices)!;
    const lastCloseTime = new Date(_.last(candles)!.closeTime);
    return {
      closePrices,
      maResultList,
      rsiResultList,
      lastClosePrice,
      lastCloseTime,
    };
  }

  calculate() {
    const params = this.getIndicatorParams(this.candles);
    return this.getStrategyResult(params);
  }

  calculateLastMASidewayPrice(
    candles: CandleChartResult[] = [],
    result?: StrategyResult,
  ): StrategyResult | null {
    if (!candles.length) return null;
    if (result?.maTrend === MarketTrend.Sideway) return result;

    const params = this.getIndicatorParams(candles);
    const newResult = this.getStrategyResult(params);
    return this.calculateLastMASidewayPrice(
      candles.slice(0, candles.length - 1),
      newResult,
    );
  }

  private getStrategyResult(params: IndicatorParams): StrategyResult {
    const trend = this.getMarketTrend(
      params.maResultList,
      params.rsiResultList,
      params.lastClosePrice,
    );

    const lastMA = params.maResultList.map((item) => _.last(item)!);
    const lastRSI = _.last(params.rsiResultList)!;

    return {
      ...trend,
      lastClosePrice: params.lastClosePrice,
      lastCloseTime: params.lastCloseTime,
      lastRSI,
      lastMA,
    };
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
}
