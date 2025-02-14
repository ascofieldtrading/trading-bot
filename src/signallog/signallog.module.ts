import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SignalLogEntity } from './entity/signalog.entity';
import { SignalLogService } from './signallog.service';

@Module({
  imports: [TypeOrmModule.forFeature([SignalLogEntity])],
  providers: [SignalLogService],
  exports: [SignalLogService],
})
export class SignalLogModule {}
