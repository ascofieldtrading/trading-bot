import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Test, TestingModule } from '@nestjs/testing';
import { MarketTrend } from '../common/enums';
import { NotificationData, NotificationLog } from '../common/interface';
import { NotificationService } from '../notification/notification.service';
import { TradingService } from './trading.service';

describe('TradingService', () => {
  let service: TradingService;

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

    service = module.get<TradingService>(TradingService);
  });

  describe('should notifyl', () => {
    it('should notify when # market trend and # ma trend', () => {
      const notificationData = {
        trend: MarketTrend.Bearish,
        maTrend: MarketTrend.Bearish,
      } as NotificationData;
      const notificationLog = {
        trend: MarketTrend.Sideway,
        maTrend: MarketTrend.Sideway,
      } as NotificationLog;
      const result = service['shouldNotify'](notificationData, notificationLog);
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
      const result = service['shouldNotify'](notificationData, notificationLog);
      expect(result).toBe(false);
    });
  });
});
