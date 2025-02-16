import { MarketTrend } from '../common/enums';
import { MAStrategyResult } from '../common/interface';

export const getMockBullishStrategyResult = (): MAStrategyResult => {
  return {
    symbol: 'SOLUSDT',
    interval: '5m',
    trend: MarketTrend.Bullish,
    maTrend: MarketTrend.Bullish,
    rsiTrend: MarketTrend.Bullish,
    lastClosePrice: 103,
    lastCloseTime: new Date(),
    lastRSI: 51,
    lastMA: [102, 101, 100],
    lastSideway: {
      close: 100,
      closeTime: new Date(),
    },
  };
};
export const getMockBerishStrategyResult = (): MAStrategyResult => {
  return {
    symbol: 'SOLUSDT',
    interval: '5m',
    trend: MarketTrend.Bearish,
    maTrend: MarketTrend.Bearish,
    rsiTrend: MarketTrend.Bearish,
    lastClosePrice: 99,
    lastCloseTime: new Date(),
    lastRSI: 49,
    lastMA: [100, 101, 102],
    lastSideway: {
      close: 100,
      closeTime: new Date(),
    },
  };
};

export const getMockSidewayStrategyResult = (): MAStrategyResult => {
  return {
    symbol: 'SOLUSDT',
    interval: '5m',
    trend: MarketTrend.Sideway,
    maTrend: MarketTrend.Sideway,
    rsiTrend: MarketTrend.Sideway,
    lastClosePrice: 101,
    lastCloseTime: new Date(),
    lastRSI: 49,
    lastMA: [102, 101, 102],
    lastSideway: {
      close: 100,
      closeTime: new Date(),
    },
  };
};
