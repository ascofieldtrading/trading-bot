import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { AppConfig } from '../common/interface';
import { UserEntity } from '../user/entity/user.entity';
import { SignalLogData, SignalLogEntity } from './entity/signalog.entity';

@Injectable()
export class SignalLogService {
  constructor(
    @InjectRepository(SignalLogEntity)
    private signalLogRepository: Repository<SignalLogEntity>,
    private configService: ConfigService<AppConfig>,
  ) {}

  saveMAStrategyResultLog(params: {
    user: UserEntity;
    logData: SignalLogData;
    isNotified: boolean;
  }) {
    const log = new SignalLogEntity();
    log.user = params.user;
    log.interval = params.logData.interval;
    log.symbol = params.logData.symbol;
    log.notified = params.isNotified;
    log.data = params.logData;
    return this.signalLogRepository.save(log);
  }

  getLatestUserLog(
    telegramUserId: number,
    where: FindOptionsWhere<SignalLogEntity>,
  ): Promise<SignalLogEntity | null> {
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
