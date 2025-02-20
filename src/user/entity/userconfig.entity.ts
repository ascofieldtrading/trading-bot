import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CreatedAtColumn, UpdatedAtColumn } from '../../common/decorators';
import { UserEntity } from './user.entity';

@Entity({ name: 'user_config' })
export class UserConfigEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => UserEntity, (user) => user.userConfig, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  user: UserEntity;

  @Column({ nullable: true })
  lookingForTrend?: string;

  @Column()
  symbols: string;

  @Column()
  intervals: string;

  @Column({ nullable: true })
  apiKey: string;

  @Column({ nullable: true })
  secretKey: string;

  @Column({ nullable: true, default: false })
  autoPlaceOrder: boolean;

  @Column({ nullable: true, default: false })
  pollingSignal: boolean;

  @CreatedAtColumn()
  createdAt: Date;

  @UpdatedAtColumn()
  updatedAt: Date;
}
