import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity({ name: 'user_config' })
export class UserConfigEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => UserEntity, (user) => user.userConfig, {
    onDelete: 'CASCADE',
  })
  @JoinColumn() // Ensures a foreign key to User
  user: UserEntity;

  @Column({ type: 'text' }) // Can store comma-separated symbols like "BTCUSDT,ETHUSDT"
  symbols: string;

  @Column({ type: 'text' }) // Can store comma-separated intervals like "1m,5m,15m"
  intervals: string;

  @Column({ type: 'int' })
  checkInSeconds: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
