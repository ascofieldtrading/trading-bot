import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationModule } from 'src/notification/notification.module';
import { TradingController } from './trading.controller';
import { TradingService } from './trading.service';

@Module({
  imports: [ScheduleModule.forRoot(), NotificationModule],
  controllers: [TradingController],
  providers: [TradingService],
})
export class TradingModule {}
