import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationModule } from 'src/notification/notification.module';
import { TradingController } from './trading.controller';
import { TradingService } from './trading.service';
import { BotModule } from '../bot/bot.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    NotificationModule,
    BotModule,
    UserModule,
  ],
  controllers: [TradingController],
  providers: [TradingService],
})
export class TradingModule {}
