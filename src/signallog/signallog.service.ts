import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { AppConfig, MAStrategyResult } from '../common/interface';
import { UserEntity } from '../user/entity/user.entity';
import { SignalLogEntity } from './entity/signalog.entity';

@Injectable()
export class SignalLogService {
  constructor(
    @InjectRepository(SignalLogEntity)
    private signalLogRepository: Repository<SignalLogEntity>,
    private configService: ConfigService<AppConfig>,
  ) {}

  saveLog(user: UserEntity, logData: MAStrategyResult, isNotified: boolean) {
    const log = new SignalLogEntity();
    log.user = user;
    log.interval = logData.interval;
    log.symbol = logData.symbol;
    log.notified = isNotified;
    log.data = {
      trend: logData.trend,
      maTrend: logData.maTrend,
      rsiTrend: logData.rsiTrend,
    };
    return this.signalLogRepository.save(log);
  }

  getLatestUserLog(
    telegramUserId: number,
    where: FindOptionsWhere<SignalLogEntity>,
  ) {
    return this.signalLogRepository.findOne({
      where: {
        user: {
          telegramUserId,
        },
        ...where,
      },
      order: { createdAt: 'DESC' },
    });
  }
}
