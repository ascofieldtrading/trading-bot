import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from '../config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NotificationModule } from './notification/notification.module';
import { TradingModule } from './trading/trading.module';
import { BotModule } from './bot/bot.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig, DatabaseConfig } from './common/interface';
import { UserModule } from './user/user.module';
import { UserEntity } from './user/entity/user.entity';
import { UserConfigEntity } from './user/entity/userconfig.entity';
import { SignalLogModule } from './signallog/signallog.module';
import { SignalLogEntity } from './signallog/entity/signalog.entity';

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
        const database = configService.get<DatabaseConfig>('database');
        return {
          type: 'postgres',
          host: database.host,
          port: database.port,
          username: database.username,
          password: database.password,
          database: database.name,
          entities: [UserEntity, UserConfigEntity, SignalLogEntity],
          synchronize: true,
          ssl: { rejectUnauthorized: false },
        };
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
