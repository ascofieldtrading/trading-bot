import { MarketTrend } from './enums';
import { CoinSymbol, Interval } from './types';

export type ENV = 'development' | 'production';
export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  username: string;
  password: string;
}

export interface BingXConfig {
  testHost: string;
  host: string;
}

export interface AppConfig {
  env: ENV;
  bingx: BingXConfig;
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

export interface LastSideway {
  close: number;
  closeTime: Date;
}

export interface StrategyResult extends Trend {
  lastSideway?: LastSideway;
  lastClosePrice: number;
  lastCloseTime: Date;
  lastRSI: number;
  lastMA: number[];
}
export interface MAStrategyResult extends StrategyResult {
  symbol: CoinSymbol;
  interval: Interval;
}
