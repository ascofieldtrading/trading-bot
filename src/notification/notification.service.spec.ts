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
      },
      old: {
        trend: MarketTrend.Bearish,
        maTrend: MarketTrend.Bearish,
      },
      expectedOutput: true,
    },
    {
      new: {
        trend: MarketTrend.Bearish,
        maTrend: MarketTrend.Bearish,
      },
      old: {
        trend: MarketTrend.Sideway,
        maTrend: MarketTrend.Sideway,
      },
      expectedOutput: true,
    },
    // FALSE
    {
      new: {
        trend: MarketTrend.Sideway,
        maTrend: MarketTrend.Bearish,
      },
      old: {
        trend: MarketTrend.Bearish,
        maTrend: MarketTrend.Bearish,
      },
      expectedOutput: false,
    },
    {
      new: {
        trend: MarketTrend.Bearish,
        maTrend: MarketTrend.Sideway,
      },
      old: {
        trend: MarketTrend.Sideway,
        maTrend: MarketTrend.Sideway,
      },
      expectedOutput: false,
    },
  ])(
    'should notify when # market trend and # ma trend',
    ({
      new: newData,
      old: oldData,
      expectedOutput,
    }: {
      new: MAStrategyResult;
      old: MAStrategyResult;
      expectedOutput: boolean;
    }) => {
      const result = service['shouldNotify'](newData, oldData);
      expect(result).toBe(expectedOutput);
    },
  );
});
