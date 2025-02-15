import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationModule } from 'src/notification/notification.module';
import { BotModule } from '../bot/bot.module';
import { SignalLogModule } from '../signallog/signallog.module';
import { UserModule } from '../user/user.module';
import { TradingController } from './trading.controller';
import { TradingService } from './trading.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    NotificationModule,
    BotModule,
    UserModule,
    SignalLogModule,
  ],
  controllers: [TradingController],
  providers: [TradingService],
})
export class TradingModule {}
