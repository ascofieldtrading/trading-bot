import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MarketTrend } from '../../common/enums';
import { MAStrategyResult } from '../../common/interface';
import { CoinSymbol, Interval } from '../../common/types';
import { UserEntity } from '../../user/entity/user.entity';

export interface SignalLogData extends MAStrategyResult {}

@Entity({ name: 'signal_log' })
export class SignalLogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, (user) => user.signalLogs, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn()
  user?: UserEntity;

  @Column()
  symbol: CoinSymbol;

  @Column()
  interval: Interval;

  @Column()
  trend: MarketTrend;

  @Column()
  closedAt: Date;

  @Column()
  notified: boolean;

  @Column({
    type: 'jsonb',
    nullable: false,
  })
  data: SignalLogData;

  @CreateDateColumn()
  createdAt: Date;
}
