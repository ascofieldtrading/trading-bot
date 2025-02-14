import { MarketTrend } from './enums';
import { CoinSymbol, Interval } from './types';
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

export interface MAStrategyResult extends Trend {
  symbol: CoinSymbol;
  interval: Interval;
  lastOpenPrice: number;
  lastRSI: number;
  lastMA: number[];
}
