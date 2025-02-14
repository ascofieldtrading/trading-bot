import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { BotModule } from 'src/bot/bot.module';

@Module({
  imports: [BotModule],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
