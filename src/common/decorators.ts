import {
  Column,
  ColumnOptions,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export function CreatedAtColumn(options?: ColumnOptions) {
  return CreateDateColumn({ type: 'timestamp with time zone', ...options });
}

export function UpdatedAtColumn(options?: ColumnOptions) {
  return UpdateDateColumn({ type: 'timestamp with time zone', ...options });
}

export function TimestampColumn(options?: ColumnOptions) {
  return Column({ type: 'timestamp with time zone', ...options });
}
