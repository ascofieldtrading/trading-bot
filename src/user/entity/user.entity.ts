import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SignalLogEntity } from '../../signallog/entity/signalog.entity';
import { UserConfigEntity } from './userconfig.entity';

@Entity({ name: 'user' })
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  telegramUserId: number;

  @Column()
  username: string;

  @Column()
  fullName: string;

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
    eager: true,
  })
  userConfig: UserConfigEntity;

  @OneToMany(() => SignalLogEntity, (signal) => signal.user)
  signalLogs: SignalLogEntity[];
}
