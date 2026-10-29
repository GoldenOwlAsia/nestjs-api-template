import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TokenModule } from '@/api/token/token.module';

import { User } from './entities';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TokenModule, TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
