import { MarketTrend } from './enum';
import { Interval } from './type';

export interface Trend {
  trend: MarketTrend;
  maTrend: MarketTrend;
  rsiTrend: MarketTrend;
}

export type NotificationLog = {
  [key in Interval]: {
    notifiedAt: string;
  } & Trend;
};

export interface NotificationMessage extends Trend {
  interval: Interval;
  lastRSI: number;
  lastWEMA: number[];
}
