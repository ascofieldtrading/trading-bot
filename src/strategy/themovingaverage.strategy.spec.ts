import { MarketTrend } from '../common/enums';
import { MAStrategyResult } from '../common/interface';
import { TheMovingAverageStrategy } from './themovingaverage.strategy';

describe('TheMovingAverageStrategy', () => {
  it.each([
    //BEARISH
    {
      maList: [[100], [101], [102]],
      rsiList: [49],
      lastOpenPrice: 99,
      expectedOutput: {
        trend: MarketTrend.Bearish,
        rsiTrend: MarketTrend.Bearish,
        maTrend: MarketTrend.Bearish,
      },
    },
    // SIDEWAY
    {
      maList: [[100], [101], [102]],
      rsiList: [49],
      lastOpenPrice: 100,
      expectedOutput: {
        trend: MarketTrend.Sideway,
        rsiTrend: MarketTrend.Bearish,
        maTrend: MarketTrend.Bearish,
      },
    },
    {
      maList: [[100], [101], [102]],
      rsiList: [50],
      lastOpenPrice: 99,
      expectedOutput: {
        trend: MarketTrend.Sideway,
        rsiTrend: MarketTrend.Sideway,
        maTrend: MarketTrend.Bearish,
      },
    },
    {
      maList: [[102], [101], [102]],
      rsiList: [50],
      lastOpenPrice: 99,
      expectedOutput: {
        trend: MarketTrend.Sideway,
        rsiTrend: MarketTrend.Sideway,
        maTrend: MarketTrend.Sideway,
      },
    },
    {
      maList: [[102], [101], [102]],
      rsiList: [51],
      lastOpenPrice: 99,
      expectedOutput: {
        trend: MarketTrend.Sideway,
        rsiTrend: MarketTrend.Bullish,
        maTrend: MarketTrend.Sideway,
      },
    },
    {
      maList: [[102], [101], [100]],
      rsiList: [50],
      lastOpenPrice: 103,
      expectedOutput: {
        trend: MarketTrend.Sideway,
        rsiTrend: MarketTrend.Sideway,
        maTrend: MarketTrend.Bullish,
      },
    },
    //BULISH
    {
      maList: [[102], [101], [100]],
      rsiList: [51],
      lastOpenPrice: 103,
      expectedOutput: {
        trend: MarketTrend.Bullish,
        rsiTrend: MarketTrend.Bullish,
        maTrend: MarketTrend.Bullish,
      },
    },
  ])(
    'should getMarketTrend work correctly',
    (data: {
      maList: number[][];
      rsiList: number[];
      lastOpenPrice: number;
      expectedOutput: MAStrategyResult;
    }) => {
      const strategy = new TheMovingAverageStrategy();

      const result = strategy['getMarketTrend'](
        data.maList,
        data.rsiList,
        data.lastOpenPrice,
      );
      expect(result).toEqual(data.expectedOutput);
    },
  );
});
