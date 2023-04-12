import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TokenModule } from '@/api/token/token.module';

import { CustomerService } from './customer.service';
import { Customer } from './entities/customer.entity';
import { CustomerController } from './customer.controller';

@Module({
  imports: [TokenModule, TypeOrmModule.forFeature([Customer])],
  controllers: [CustomerController],
  providers: [CustomerService],
  exports: [CustomerService],
})
export class CustomerModule {}
