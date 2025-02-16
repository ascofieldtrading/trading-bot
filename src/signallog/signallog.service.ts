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
      order: { lastCloseAt: 'DESC', createdAt: 'DESC' },
    });
  }

  async saveSystemLogIfNeeded(newScheduleLog: SignalLogEntity) {
    const lastSystemSignalLog = await this.signalLogRepository.findOne({
      where: {
        symbol: newScheduleLog.symbol,
        interval: newScheduleLog.interval,
      },
      order: {
        lastCloseAt: 'DESC',
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
      triggerSource: SignalLogTriggerSource.ScheduleJob,
      user: undefined,
      notified: false,
    });
    const result = await this.signalLogRepository.save(newSystemLog);
    return result;
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
      order: { lastCloseAt: 'DESC', createdAt: 'DESC' },
    });
  }
}
