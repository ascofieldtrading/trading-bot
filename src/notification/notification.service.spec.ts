import { Test, TestingModule } from '@nestjs/testing';
import { BotService } from '../bot/bot.service';
import { MarketTrend } from '../common/enums';
import { MAStrategyResult } from '../common/interface';
import { SignalLogService } from '../signallog/signallog.service';
import { UserService } from '../user/user.service';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: BotService,
          useValue: {},
        },
        { provide: SignalLogService, useValue: {} },
        { provide: UserService, useValue: {} },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it.each([
    // TRUE
    {
      new: {
        trend: MarketTrend.Sideway,
        maTrend: MarketTrend.Sideway,
        lastClosePrice: 100,
        lastMA: [101, 101, 102],
      },
      old: {
        trend: MarketTrend.Bearish,
        maTrend: MarketTrend.Bearish,
        lastClosePrice: 99,
        lastMA: [100, 101, 102],
      },
      expectedOutput: true,
    },
    {
      new: {
        trend: MarketTrend.Bearish,
        maTrend: MarketTrend.Bearish,
        lastClosePrice: 99,
        lastMA: [100, 101, 102],
      },
      old: {
        trend: MarketTrend.Sideway,
        maTrend: MarketTrend.Sideway,
        lastClosePrice: 100,
        lastMA: [101, 101, 102],
      },
      expectedOutput: true,
    },
    {
      new: {
        trend: MarketTrend.Sideway,
        maTrend: MarketTrend.Bearish,
        lastClosePrice: 101,
        lastMA: [100, 101, 102],
      },
      old: {
        trend: MarketTrend.Bearish,
        maTrend: MarketTrend.Bearish,
        lastClosePrice: 99,
        lastMA: [100, 101, 102],
      },
      expectedOutput: true,
    },
    {
      new: {
        trend: MarketTrend.Sideway,
        maTrend: MarketTrend.Bullish,
        lastClosePrice: 101,
        lastMA: [102, 101, 100],
      },
      old: {
        trend: MarketTrend.Bullish,
        maTrend: MarketTrend.Bullish,
        lastClosePrice: 103,
        lastMA: [102, 101, 100],
      },
      expectedOutput: true,
    },
    {
      new: {
        trend: MarketTrend.Bearish,
        maTrend: MarketTrend.Sideway,
        lastClosePrice: 99,
        lastMA: [101, 101, 102],
      },
      old: {
        trend: MarketTrend.Sideway,
        maTrend: MarketTrend.Sideway,
        lastClosePrice: 99,
        lastMA: [101, 101, 102],
      },
      expectedOutput: true,
    },
    // FALSE
    {
      new: {
        trend: MarketTrend.Sideway,
        maTrend: MarketTrend.Bearish,
        lastClosePrice: 100.9,
        lastMA: [100, 101, 102],
      },
      old: {
        trend: MarketTrend.Bearish,
        maTrend: MarketTrend.Bearish,
        lastClosePrice: 99,
        lastMA: [100, 101, 102],
      },
      expectedOutput: false,
    },
  ] as {
    new: Partial<MAStrategyResult>;
    old: Partial<MAStrategyResult>;
    expectedOutput: boolean;
  }[])(
    'should notify',
    ({
      new: newData,
      old: oldData,
      expectedOutput,
    }: {
      new: Partial<MAStrategyResult>;
      old: Partial<MAStrategyResult>;
      expectedOutput: boolean;
    }) => {
      const result = service['shouldNotifyUser'](
        newData as MAStrategyResult,
        oldData as MAStrategyResult,
      );
      expect(result).toBe(expectedOutput);
    },
  );
});
