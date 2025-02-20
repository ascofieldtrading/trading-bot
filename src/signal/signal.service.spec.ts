import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from '../notification/notification.service';
import { SignalService } from './signal.service';

describe.skip('SignalService', () => {
  let signalService: SignalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignalService,
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

    signalService = module.get<SignalService>(SignalService);
  });

  it('should be defined', () => {
    expect(signalService).toBeDefined();
  });
});
