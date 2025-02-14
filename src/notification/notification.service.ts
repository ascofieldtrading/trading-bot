import { Injectable, Logger } from '@nestjs/common';
import { SendMessageOptions } from 'node-telegram-bot-api';
import { BotService } from '../bot/bot.service';
import { MarketTrend } from '../common/enums';
import { MAStrategyResult } from '../common/interface';
import { SignalLogEntity } from '../signallog/entity/signalog.entity';
import { SignalLogService } from '../signallog/signallog.service';
import { UserEntity } from '../user/entity/user.entity';
import { UserService } from '../user/user.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private botService: BotService,
    private userSerice: UserService,
    private signalLogService: SignalLogService,
  ) {}

  async notifyStatusToUsers(data: MAStrategyResult) {
    const users = await this.userSerice.getUsersBySymbolAndInterval(
      [data.symbol],
      [data.interval],
    );

    try {
      users.forEach(async (user) => {
        const lastSignalLog = await this.signalLogService.getLatestUserLog(
          user.telegramUserId,
          { notified: true },
        );
        const shouldNotify = this.shouldNotify(data, lastSignalLog);
        const userText = `user (telegramUserId=${user.telegramUserId})`;
        if (shouldNotify) {
          await this.notifyUser(user, data);
          this.logger.verbose([
            `Notified ${userText}`,
            `${data.symbol} - ${data.interval} - ${data.trend}`,
          ]);
          return;
        }
        this.logger.verbose([
          `Skip notify ${userText}`,
          `${data.symbol} - ${data.interval} - ${data.trend}`,
        ]);
      });
    } catch (e) {
      this.logger.error(
        `Failed to notify and save logs: ${data.interval}. Error: ${e}`,
      );
    }
  }

  public async notifyUser(user: UserEntity, data: MAStrategyResult) {
    const content = this.getMAMessageContent(data);
    await this.sendMessageToUser(user, content);
    await this.signalLogService.saveLog(user, data, true);
  }

  private getMAMessageContent(data: MAStrategyResult): string[] {
    const maValues = data.lastMA.reduce(
      (prev, current, i) => [...prev, `MA${i + 1}: ${current.toFixed(4)}`],
      [],
    );
    return [
      `Symbol: ${data.symbol}`,
      `Interval: ${data.interval}`,
      `Trend: ${data.trend}`,
      ...maValues,
      `RSI: ${data.lastRSI}`,
    ];
  }

  async sendMessageToAllUsers(data: string[]) {
    const users = await this.userSerice.getUsers();
    const pros = users.map((u) =>
      this.botService.simpleNotify(u.telegramChatId, data),
    );
    return Promise.all(pros);
  }

  sendMessageToUser(
    user: UserEntity,
    data: string[],
    options?: SendMessageOptions,
  ) {
    return this.botService.simpleNotify(user.telegramChatId, data, options);
  }

  sendUserConfigs(user: UserEntity) {
    return this.sendMessageToUser(user, [
      'Bellow are your configs',
      `Symbols: ${user.userConfig.symbols}`,
      `Intervals: ${user.userConfig.intervals}`,
    ]);
  }

  private shouldNotify(data: MAStrategyResult, signalLog: SignalLogEntity) {
    return (
      !signalLog ||
      (data.trend !== signalLog.data.trend &&
        (data.trend === MarketTrend.Sideway ||
          data.maTrend !== signalLog.data.maTrend))
    );
  }
}
