import { Message } from 'node-telegram-bot-api';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entity/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {}

  async createUserIfNotExists(message: Message) {
    const user = await this.userRepository.findOneBy({
      telegramUserId: message.from.id,
    });

    if (user) return user;

    const newUser = new UserEntity();
    newUser.telegramUserId = message.from.id;
    newUser.telegramChatId = message.chat.id;
    return this.userRepository.save(newUser);
  }
  getUser(telegramUserId: number) {
    return this.userRepository.findOneBy({
      telegramUserId,
    });
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

  async getUserByTelegramUserId(id: number): Promise<UserEntity | null> {
    return this.userRepository.findOneBy({ telegramUserId: id });
  }
}
