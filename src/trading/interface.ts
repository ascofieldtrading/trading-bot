import { MarketTrend } from './enum';
import { Interval } from './type';

export type NotificationLog = {
  [key in Interval]: {
    notifiedAt: string;
    marketTrend: MarketTrend;
  };
};

export interface NotificationMessage {
  interval: Interval;
  marketTrend: MarketTrend;
  lastRSI: number;
  lastWEMA: number[];
}
