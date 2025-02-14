import { Test, TestingModule } from '@nestjs/testing';
import { SignalLogService } from './signallog.service';

describe.skip('SignallogService', () => {
  let service: SignalLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SignalLogService],
    }).compile();

    service = module.get<SignalLogService>(SignalLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
