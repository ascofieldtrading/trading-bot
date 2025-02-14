import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from '../notification/notification.service';
import { TradingService } from './trading.service';

describe.skip('TradingService', () => {
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

  it('should be defined', () => {
    expect(tradingService).toBeDefined();
  });
});
