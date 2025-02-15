import {
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CreatedAtColumn, UpdatedAtColumn } from '../../common/decorators';
import { SignalLogEntity } from '../../signallog/entity/signalog.entity';
import { UserConfigEntity } from './userconfig.entity';

@Entity({ name: 'user' })
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  username?: string;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ unique: true })
  telegramUserId: number;

  @Column({ unique: true })
  telegramChatId: number;

  @Column({ default: true })
  notificationEnabled: boolean;

  @CreatedAtColumn()
  createdAt: Date;

  @UpdatedAtColumn()
  updatedAt: Date;

  @OneToOne(() => UserConfigEntity, (userConfig) => userConfig.user, {
    cascade: true,
    eager: true,
  })
  userConfig: UserConfigEntity;

  @OneToMany(() => SignalLogEntity, (signal) => signal.user)
  signalLogs: SignalLogEntity[];
}
