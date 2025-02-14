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
    telegramChatId: parseInt(process.env.TELEGRAM_CHAT_ID, 10),
    scheduledCronValue: process.env.SCHEDULED_CRON_VALUE ?? '0 * * * * *',
    notificationEnabled: process.env.NOTIFICATION_ENABLED
      ? process.env.NOTIFICATION_ENABLED == 'true'
      : false,
    notificationOnStart: process.env.NOTIFICATION_ENABLED
      ? process.env.NOTIFICATION_ON_START == 'true'
      : false,
    intervals: process.env.INTERVALS
      ? (process.env.INTERVALS.split(',') as Interval[])
      : ['15m'],
    symbols: process.env.INTERVALS
      ? process.env.SYMBOLS.split(',')
      : ['SOLUSDT'],
    database: {
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT, 10),
      name: process.env.DATABASE_NAME,
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
    },
  }) as AppConfig;
