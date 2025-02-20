import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationModule } from 'src/notification/notification.module';
import { BotModule } from '../bot/bot.module';
import { SignalLogModule } from '../signallog/signallog.module';
import { TradingModule } from '../trading/trading.module';
import { UserModule } from '../user/user.module';
import { SignalController } from './signal.controller';
import { SignalService } from './signal.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    NotificationModule,
    BotModule,
    UserModule,
    SignalLogModule,
    TradingModule,
  ],
  controllers: [SignalController],
  providers: [SignalService],
})
export class SignalModule {}
