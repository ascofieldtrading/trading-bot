import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from 'node-telegram-bot-api';
import { FindOptionsWhere, Like, Repository } from 'typeorm';
import {
  NEW_USER_DEFAULT_INTERVALS,
  NEW_USER_DEFAULT_SYMBOLS,
} from '../common/constant';
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
    symbols: string[],
    intervals: string[],
    { notificationEnabled = true }: Partial<UserEntity> = {
      notificationEnabled: true,
    },
  ) {
    return this.userRepository.find({
      where: {
        notificationEnabled,
        userConfig: {
          symbols: Like(`%${symbols.join(',')}%`),
          intervals: Like(`%${intervals.join(',')}%`),
        },
      },
    });
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
      telegramUserId: message.from!.id,
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

  async disableUserNotification(user: UserEntity) {
    if (!user) return false;
    user.notificationEnabled = false;
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
