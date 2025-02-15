import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CreatedAtColumn } from '../../common/decorators';
import { MarketTrend, SignalLogTriggerSource } from '../../common/enums';
import { MAStrategyResult } from '../../common/interface';
import { CoinSymbol, Interval } from '../../common/types';
import { UserEntity } from '../../user/entity/user.entity';

@Entity({ name: 'signal_log' })
export class SignalLogEntity {
  constructor(init?: Partial<SignalLogEntity>) {
    init && Object.assign(this, init);
  }

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
  maTrend: MarketTrend;

  @Column({ type: 'float' })
  lastClosePrice: number;

  @Column({ type: 'timestamp with time zone' })
  lastCloseAt: Date;

  @Column()
  triggerSource: SignalLogTriggerSource;

  @Column({ default: false })
  notified: boolean;

  @Column({
    type: 'jsonb',
    nullable: false,
    default: {},
  })
  data: MAStrategyResult;

  @CreatedAtColumn()
  createdAt: Date;
}
