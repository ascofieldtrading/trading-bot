import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from '../config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BotModule } from './bot/bot.module';
import { AppConfig, DatabaseConfig, ENV } from './common/interface';
import { NotificationModule } from './notification/notification.module';
import { SignalLogEntity } from './signallog/entity/signalog.entity';
import { SignalLogModule } from './signallog/signallog.module';
import { TradingModule } from './trading/trading.module';
import { UserEntity } from './user/entity/user.entity';
import { UserConfigEntity } from './user/entity/userconfig.entity';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: `${process.cwd()}/config/env/${process.env.NODE_ENV}.env`,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig>) => {
        const database = configService.get<DatabaseConfig>('database')!;
        const config = {
          type: 'postgres',
          host: database.host,
          port: database.port,
          username: database.username,
          password: database.password,
          database: database.name,
          entities: [UserEntity, UserConfigEntity, SignalLogEntity],
          synchronize: true,
          ...(configService.get<ENV>('env') === 'production'
            ? {
                ssl: {
                  rejectUnauthorized: false,
                },
              }
            : {}),
          extra: {
            max: 5,
            idleTimeoutMillis: 30000,
          },
        };
        console.log('xxx', config);
        return config as any;
      },
    }),
    TradingModule,
    NotificationModule,
    BotModule,
    UserModule,
    SignalLogModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
