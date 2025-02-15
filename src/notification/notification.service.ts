import { Injectable, Logger } from '@nestjs/common';
import _ from 'lodash';
import moment from 'moment';
import { BotService } from '../bot/bot.service';
import { MarketTrend, SignalLogTriggerSource } from '../common/enums';
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

  async sendStatusToUsers(data: MAStrategyResult) {
    const users = await this.userSerice.getUsersBySymbolAndInterval(
      data.symbol,
      data.interval,
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
      const shouldNotify = this.shouldNotifyUser(data, lastSignalLog?.data);
      const userText = `user (telegramUserId=${user.telegramUserId})`;
      if (shouldNotify) {
        await this.sendStatusToUser(user, data);
        this.logger.verbose([
          `Notified ${userText}`,
          `${data.symbol} - ${data.interval} - ${data.trend}`,
        ]);
        return;
      }
    });
  }

  public async sendStatusToUser(user: UserEntity, data: MAStrategyResult) {
    const content = this.getMAMessageContent(data);
    await this.botService.sendMultilineMessage(user.telegramChatId, content, {
      parse_mode: 'HTML',
    });

    const log = new SignalLogEntity({
      user,
      notified: true,
      triggerSource: SignalLogTriggerSource.ScheduleJob,
      interval: data.interval,
      symbol: data.symbol,
      trend: data.trend,
      maTrend: data.maTrend,
      lastClosePrice: data.lastClosePrice,
      lastCloseAt: data.lastCloseTime,
      data,
    });
    await Promise.all([
      this.signalLogService.save(log),
      this.signalLogService.saveSystemLogIfNeeded(log),
    ]);
  }

  private getMAMessageContent(data: MAStrategyResult): string[] {
    const getHeader = () => {
      const getTrendMessage = {
        [MarketTrend.Bullish]: (msg) => `🟢 ${msg} 🟢 `,
        [MarketTrend.Bearish]: (msg) => `🔴 ${msg} 🔴 `,
        [MarketTrend.Sideway]: (msg) => msg,
      };
      return getTrendMessage[data.trend](
        `<b>${data.symbol} ${data.interval} - ${_.upperFirst(data.trend)}</b>`,
      );
    };
    const getPrice = () => {
      const getDescription = () => {
        if (!data.lastSideway) return '';
        const priceDiffInPercent =
          (((data.lastClosePrice - data.lastSideway.close) *
            (data.trend === MarketTrend.Bearish ? -1 : 1)) /
            data.lastSideway.close) *
          100;
        return ` (${priceDiffInPercent > 0 ? '+' : ''}${priceDiffInPercent.toFixed(2)}%)`;
      };
      return `Price: ${data.lastClosePrice.toFixed(4)}${getDescription()}`;
    };
    const getMALines = () =>
      data.lastMA.map((value, i) => `MA${i + 1}: ${value.toFixed(4)}`);
    const getRSI = () => {
      return `RSI: ${data.lastRSI.toFixed(2)}`;
    };
    const getLastSidewayLines = () => {
      if (!data.lastSideway) return '';
      const date = moment(data.lastSideway.closeTime);
      const dateStr = `${date.fromNow()} (${date.format('DD/MM')} at ${date.format('HH:mm')})`;
      const trendIcon = data.trend === MarketTrend.Bullish ? '🔼' : '🔽';
      return [
        '',
        `${trendIcon} Trend Started: ${data.lastSideway.close.toFixed(4)}`,
        `${dateStr}`,
      ];
    };
    //

    const contentLines = [
      getHeader(),
      '',
      getPrice(),
      getRSI(),
      ...getMALines(),
    ];
    if (data.lastSideway) return contentLines.concat(getLastSidewayLines());
    return contentLines;
  }

  private shouldNotifyUser(
    newResult: MAStrategyResult,
    old?: MAStrategyResult,
  ) {
    if (!old) return true;
    if (newResult.trend === old.trend) return false;
    if (newResult.maTrend !== old.maTrend) return true;
    if (
      old.trend === MarketTrend.Bearish &&
      newResult.lastClosePrice >= newResult.lastMA[1]
    )
      return true;
    if (
      old.trend === MarketTrend.Bullish &&
      newResult.lastClosePrice <= newResult.lastMA[1]
    )
      return true;
    return false;
  }

  public sendErrorMessage(chatId: number) {
    return this.botService.sendMessage(chatId, 'Something went wrong!');
  }
}
