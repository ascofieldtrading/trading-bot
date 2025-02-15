import { Injectable, Logger } from '@nestjs/common';
import _ from 'lodash';
import moment from 'moment';
import { SendMessageOptions } from 'node-telegram-bot-api';
import { BotService } from '../bot/bot.service';
import { MarketTrend } from '../common/enums';
import { MAStrategyResult } from '../common/interface';
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

  async sendSignalStatusToUsers(data: MAStrategyResult) {
    const users = await this.userSerice.getUsersBySymbolAndInterval(
      [data.symbol],
      [data.interval],
    );
    users.forEach(async (user) => {
      const lastSignalLog = await this.signalLogService.getLatestUserLog(
        user.telegramUserId,
        {
          interval: data.interval,
          symbol: data.symbol,
          notified: true,
        },
      );
      const shouldNotify = this.shouldNotify(data, lastSignalLog?.data);
      const userText = `user (telegramUserId=${user.telegramUserId})`;
      if (shouldNotify) {
        await this.sendSignalStatusToUser(user, data);
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
  }

  public async sendSignalStatusToUser(
    user: UserEntity,
    data: MAStrategyResult,
  ) {
    const content = this.getMAMessageContent(data);
    await this.sendMessageToUser(user, content, { parse_mode: 'HTML' });
    await this.signalLogService.saveMAStrategyResultLog({
      user,
      logData: data,
      isNotified: true,
    });
  }

  async sendMessageToAllUsers(data: string[]) {
    const users = await this.userSerice.getUsers();
    const pros = users.map((u) =>
      this.botService.sendMultilineMessage(u.telegramChatId, data),
    );
    return Promise.all(pros);
  }

  sendMessageToUser(
    user: UserEntity,
    data: string[],
    options?: SendMessageOptions,
  ) {
    return this.botService.sendMultilineMessage(
      user.telegramChatId,
      data,
      options,
    );
  }

  sendUserConfigs(user: UserEntity) {
    return this.sendMessageToUser(user, [
      'Bellow are your configs',
      `Symbols: ${user.userConfig.symbols}`,
      `Intervals: ${user.userConfig.intervals}`,
    ]);
  }

  private getMAMessageContent(data: MAStrategyResult): string[] {
    const maValues = data.lastMA.reduce(
      (prev, current, i) => [...prev, `MA${i + 1}: ${current.toFixed(4)}`],
      [],
    );
    const getTrendMessage = {
      [MarketTrend.Bullish]: (msg) => `🟢 ${msg}`,
      [MarketTrend.Bearish]: (msg) => `🔴 ${msg}`,
      [MarketTrend.Sideway]: (msg) => msg,
    };

    const lastSidewayPriceContent: string[] = data.lastSideway
      ? [
          `Last Sideway: ${data.lastSideway.close.toFixed(4)} (${moment(data.lastSideway.closeTime).fromNow()})`,
        ]
      : [];
    return [
      getTrendMessage[data.trend](
        `${data.symbol} ${data.interval} ${_.upperFirst(data.trend)}`,
      ),
      '',
      ...maValues,
      `RSI: ${data.lastRSI}`,
      '',
      `Last Price: ${data.lastClosePrice}`,
      '',
      ...lastSidewayPriceContent,
    ];
  }

  private shouldNotify(result: MAStrategyResult, old?: MAStrategyResult) {
    if (!old) return true;
    if (result.trend === old.trend) return false;
    if (result.maTrend === old.maTrend) return false;

    return true;
  }

  public sendErrorMessage(chatId: number) {
    return this.botService.sendMessage(chatId, 'Something went wrong!');
  }
}
