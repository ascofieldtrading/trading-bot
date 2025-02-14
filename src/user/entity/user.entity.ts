import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserConfigEntity } from './userconfig.entity';

@Entity({ name: 'user' })
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  telegramUserId: number;

  @Column({ unique: true })
  telegramChatId: number;

  @Column({ default: true })
  notificationEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => UserConfigEntity, (userConfig) => userConfig.user, {
    cascade: true,
  })
  userConfig: UserConfigEntity;
}
