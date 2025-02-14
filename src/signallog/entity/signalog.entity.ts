import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CoinSymbol, Interval } from '../../common/types';
import { UserEntity } from '../../user/entity/user.entity';
import { MarketTrend } from '../../common/enums';

export interface SignalLogData {
  trend: MarketTrend;
  maTrend: MarketTrend;
  rsiTrend: MarketTrend;
}

@Entity({ name: 'signal_log' })
export class SignalLogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, (user) => user.signalLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  user: UserEntity;

  @Column()
  symbol: CoinSymbol;

  @Column()
  interval: Interval;

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
