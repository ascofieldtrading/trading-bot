import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { BotModule } from 'src/bot/bot.module';
import { UserModule } from '../user/user.module';
import { SignalLogModule } from '../signallog/signallog.module';

@Module({
  imports: [BotModule, UserModule, SignalLogModule],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
