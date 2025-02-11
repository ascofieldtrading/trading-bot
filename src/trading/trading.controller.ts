import { Controller, Get } from '@nestjs/common';
import { TradingService } from './trading.service';

@Controller('trading')
export class TradingController {
  constructor(private tradingService: TradingService) {}

  @Get('test')
  test() {
    this.tradingService.main();
  }
}
