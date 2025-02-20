import { Test, TestingModule } from '@nestjs/testing';
import { SignalController } from './signal.controller';

describe.skip('SignalController', () => {
  let controller: SignalController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SignalController],
    }).compile();

    controller = module.get<SignalController>(SignalController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
