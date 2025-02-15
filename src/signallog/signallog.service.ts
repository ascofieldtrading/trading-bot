import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { MarketTrend, SignalLogType } from '../common/enums';
import { AppConfig } from '../common/interface';
import { CoinSymbol, Interval } from '../common/types';
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
    log.trend = params.logData.trend;
    log.lastClosePrice = params.logData.lastClosePrice;
    log.lastCloseAt = params.logData.lastCloseTime;
    log.data = params.logData;
    log.notified = params.isNotified;
    return Promise.all([
      this.checkAndSaveSystemSignalLog(log),
      this.signalLogRepository.save(log),
    ]);
  }

  getLastSideway({
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
        trend: MarketTrend.Sideway,
      },
      order: { lastCloseAt: 'DESC' },
    });
  }

  private async checkAndSaveSystemSignalLog(log: SignalLogEntity) {
    const lastSystemSignalLog = await this.signalLogRepository.findOne({
      where: {
        symbol: log.symbol,
        interval: log.interval,
        type: SignalLogType.UpdateRealtime,
        user: IsNull(),
      },
      order: {
        createdAt: 'DESC',
      },
    });
    if (lastSystemSignalLog && lastSystemSignalLog.trend === log.trend) return;
    const newLog = Object.assign(new SignalLogEntity(), log);
    newLog.user = undefined;
    newLog.notified = false;
    return this.signalLogRepository.save(newLog);
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
