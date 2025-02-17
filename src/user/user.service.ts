import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from 'node-telegram-bot-api';
import { FindOptionsWhere, Raw, Repository } from 'typeorm';
import {
  NEW_USER_DEFAULT_INTERVALS,
  NEW_USER_DEFAULT_SYMBOLS,
} from '../common/constant';
import { MarketTrend } from '../common/enums';
import { AppConfig } from '../common/interface';
import { UserEntity } from './entity/user.entity';
import { UserConfigEntity } from './entity/userconfig.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private configService: ConfigService<AppConfig>,
  ) {}

  async getUsersBySymbolAndInterval(
    symbols: string,
    intervals: string,
    { notificationEnabled = true }: Partial<UserEntity> = {
      notificationEnabled: true,
    },
  ) {
    const result = await this.userRepository.find({
      where: {
        notificationEnabled,
        userConfig: {
          symbols: Raw((alias) => `${alias} ~ '(^|,)${symbols}(,|$)'`),
          intervals: Raw((alias) => `${alias} ~ '(^|,)${intervals}(,|$)'`),
        },
      },
    });
    return result;
  }

  async getUsers(
    { notificationEnabled = true }: Partial<UserEntity> = {
      notificationEnabled: true,
    },
  ) {
    return this.userRepository.findBy({ notificationEnabled });
  }

  async createUserIfNotExists(message: Message) {
    const user = await this.userRepository.findOneBy({
      telegramChatId: message.chat!.id,
    });

    if (user) return user;

    const userConfig = new UserConfigEntity();
    userConfig.symbols = NEW_USER_DEFAULT_SYMBOLS.join(',');
    userConfig.intervals = NEW_USER_DEFAULT_INTERVALS.join(',');

    const newUser = new UserEntity();
    newUser.userConfig = userConfig;
    newUser.username = message.from?.username;
    newUser.firstName = message.from?.first_name;
    newUser.telegramUserId = message.from!.id;
    newUser.telegramUserId = message.from!.id;
    newUser.telegramChatId = message.chat.id;
    return this.userRepository.save(newUser);
  }

  getUser(telegramUserId: number) {
    return this.userRepository.findOneBy({
      telegramUserId,
    });
  }

  async update(user: UserEntity) {
    return this.userRepository.save(user);
  }

  async enableUserNotification(user: UserEntity): Promise<UserEntity> {
    user.notificationEnabled = true;
    return this.userRepository.save(user);
  }

  async updateLookingForTrend(
    user: UserEntity,
    trend?: MarketTrend,
  ): Promise<UserEntity> {
    user.userConfig.lookingForTrend = trend;
    return this.userRepository.save(user);
  }

  async switchNotification(user: UserEntity) {
    if (!user) return false;
    user.notificationEnabled = !user.notificationEnabled;
    await this.userRepository.save(user);
    return true;
  }

  async getUserByTelegramUserId(
    id: number,
    where?: FindOptionsWhere<UserEntity>,
  ): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { telegramUserId: id, ...where },
    });
  }
}
