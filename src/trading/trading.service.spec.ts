import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Test, TestingModule } from '@nestjs/testing';
import { MarketTrend } from '../common/enums';
import { NotificationData, NotificationLog, Trend } from '../common/interface';
import { NotificationService } from '../notification/notification.service';
import { TradingService } from './trading.service';

describe('TradingService', () => {
  let tradingService: TradingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradingService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: SchedulerRegistry,
          useValue: {},
        },
        {
          provide: NotificationService,
          useValue: {},
        },
      ],
    }).compile();

    tradingService = module.get<TradingService>(TradingService);
  });

  describe('should notify', () => {
    it('should notify when # market trend and # ma trend', () => {
      const notificationData = {
        trend: MarketTrend.Bearish,
        maTrend: MarketTrend.Bearish,
      } as NotificationData;
      const notificationLog = {
        trend: MarketTrend.Sideway,
        maTrend: MarketTrend.Sideway,
      } as NotificationLog;

      const result = tradingService['shouldNotify'](
        notificationData,
        notificationLog,
      );
      expect(result).toBe(true);
    });

    it('should not notify', () => {
      const notificationData = {
        trend: MarketTrend.Bearish,
        maTrend: MarketTrend.Bearish,
      } as NotificationData;
      const notificationLog = {
        trend: MarketTrend.Sideway,
        maTrend: MarketTrend.Bearish,
      } as NotificationLog;
      const result = tradingService['shouldNotify'](
        notificationData,
        notificationLog,
      );
      expect(result).toBe(false);
    });
  });

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
      expectedOutput: Trend;
    }) => {
      const trend = tradingService['getMarketTrend'](
        data.maList,
        data.rsiList,
        data.lastOpenPrice,
      );
      expect(trend).toEqual(data.expectedOutput);
    },
  );
});
