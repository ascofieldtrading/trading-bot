import { Interval } from 'src/common/types';
import { AppConfig } from '../src/common/interface';

export default () =>
  ({
    binanceApiKey: process.env.BINANCE_API_KEY,
    binanceSecretKey: process.env.BINANCE_SECRET_KEY,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    fetchPriceLimit: process.env.FETCH_PRICE_LIMIT
      ? parseInt(process.env.FETCH_PRICE_LIMIT, 10)
      : 500,
    scheduledCronValue: process.env.SCHEDULED_CRON_VALUE ?? '0 * * * * *',
    notificationEnabled: process.env.NOTIFICATION_ENABLED
      ? process.env.NOTIFICATION_ENABLED == 'true'
      : false,
    intervals: process.env.INTERVALS
      ? (process.env.INTERVALS.split(',') as Interval[])
      : ['15m'],
    symbols: process.env.SYMBOLS ? process.env.SYMBOLS.split(',') : ['SOLUSDT'],
    database: {
      host: process.env.DATABASE_HOST,
      port: process.env.DATABASE_PORT
        ? parseInt(process.env.DATABASE_PORT, 10)
        : 5432,
      name: process.env.DATABASE_NAME,
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
    },
    env: process.env.NODE_ENV ?? 'development',
  }) as AppConfig;
