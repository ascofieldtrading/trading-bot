import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { MarketTrend, SignalLogTriggerSource } from '../common/enums';
import { AppConfig } from '../common/interface';
import { CoinSymbol, Interval } from '../common/types';
import { SignalLogEntity } from './entity/signalog.entity';

@Injectable()
export class SignalLogService {
  constructor(
    @InjectRepository(SignalLogEntity)
    private signalLogRepository: Repository<SignalLogEntity>,
    private configService: ConfigService<AppConfig>,
  ) {}

  async saveAppStartLogIfNotExists(log: SignalLogEntity) {
    const existingLog = await this.signalLogRepository.findOne({
      where: {
        interval: log.interval,
        symbol: log.symbol,
        trend: log.trend,
        lastClosePrice: log.lastClosePrice,
        lastCloseAt: log.lastCloseAt,
        triggerSource: SignalLogTriggerSource.AppStart,
      },
    });
    if (existingLog) {
      return;
    }
    return this.signalLogRepository.save(log);
  }

  save(log: SignalLogEntity) {
    return this.signalLogRepository.save(log);
  }

  getLastMASideway({
    interval,
    symbol,
  }: {
    interval: Interval;
    symbol: CoinSymbol;
  }) {
    return this.signalLogRepository.findOne({
      where: {
        user: IsNull(),
        interval,
        symbol,
        maTrend: MarketTrend.Sideway,
      },
      order: { lastCloseAt: 'DESC' },
    });
  }

  async saveSystemLogIfNeeded(newScheduleLog: SignalLogEntity) {
    const lastSystemSignalLog = await this.signalLogRepository.findOne({
      where: {
        symbol: newScheduleLog.symbol,
        interval: newScheduleLog.interval,
        triggerSource: SignalLogTriggerSource.ScheduleJob,
        user: IsNull(),
      },
      order: {
        createdAt: 'DESC',
      },
    });
    if (
      lastSystemSignalLog &&
      lastSystemSignalLog.trend === newScheduleLog.trend
    )
      return;
    const newSystemLog = new SignalLogEntity({
      ...newScheduleLog,
      user: undefined,
      notified: false,
    });
    return this.signalLogRepository.save(newSystemLog);
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
