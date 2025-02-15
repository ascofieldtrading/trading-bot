import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CreatedAtColumn } from '../../common/decorators';
import { MarketTrend, SignalLogType } from '../../common/enums';
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

  @Column({ type: 'float' })
  lastClosePrice: number;

  @Column({ type: 'timestamp with time zone' })
  lastCloseAt: Date;

  @Column({ default: SignalLogType.UpdateRealtime })
  type: SignalLogType;

  @Column({ default: false })
  notified: boolean;

  @Column({
    type: 'jsonb',
    nullable: false,
    default: {},
  })
  data: SignalLogData;

  @CreatedAtColumn()
  createdAt: Date;
}
