import { MarketTrend } from './enums';
import { Interval } from './types';

export interface AppConfig {
  binanceApiKey: string;
  binanceSecretKey: string;
  telegramBotToken: string;
  fetchPriceLimit: number;
  telegramChatId: number;
  scheduledCronValue: string;
  intervals: Interval[];
  symbols: string[];
  notificationEnabled: boolean;
  notificationOnStart: boolean;
}

export interface Trend {
  trend: MarketTrend;
  maTrend: MarketTrend;
  rsiTrend: MarketTrend;
}

export type NotificationLog = {
  notifiedAt: string;
} & Trend;
export type NotificationLogs = {
  [key in Interval]: {
    [key in string]: NotificationLog;
  };
};

export interface NotificationData extends Trend {
  symbol: string;
  interval: Interval;
  lastRSI: number;
  lastMA: number[];
}
