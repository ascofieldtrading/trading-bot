import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entity/user.entity';
import { UserConfigEntity } from './entity/userconfig.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, UserConfigEntity])],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
