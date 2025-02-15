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

import { Logger } from '@nestjs/common';
import { performance } from 'perf_hooks';

export function TimeMeasure() {
  const logger = new Logger(TimeMeasure.name);
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = performance.now();
      try {
        return await originalMethod.apply(this, args);
      } finally {
        const end = performance.now();
        logger.verbose(
          `[${propertyKey}] Execution time: ${(end - start).toFixed(2)}ms`,
        );
      }
    };

    return descriptor;
  };
}
