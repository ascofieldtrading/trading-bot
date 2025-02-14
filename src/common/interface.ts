import { MarketTrend } from './enums';
import { Interval } from './types';
export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  username: string;
  password: string;
}

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
  database: DatabaseConfig;
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
