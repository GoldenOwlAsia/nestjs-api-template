import { Body, Param } from '@nestjs/common';

import { IJwtStrategy } from '@/api/auth/strategies';
import { InjectController, InjectRoute, ReqUser } from '@/decorators';

import customerRoutes from './customer.routes';
import { CustomerService } from './customer.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto';

import type {
  GotCustomerDto,
  CreatedCustomerDto,
  UpdatedCustomerDto,
  GotCustomerDetailDto,
} from './dto';
import type { Customer } from './entities/customer.entity';

@InjectController({ name: customerRoutes.index })
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @InjectRoute(customerRoutes.create)
  public async create(
    @Body() data: CreateCustomerDto,
  ): Promise<CreatedCustomerDto> {
    const createdCustomer = await this.customerService.create(data);

    return createdCustomer;
  }

  @InjectRoute(customerRoutes.getAll)
  public async getAll(): Promise<GotCustomerDto[]> {
    const gotCustomers = await this.customerService.getAll();

    return gotCustomers;
  }

  @InjectRoute(customerRoutes.getMe)
  public async getMe(@ReqUser() user: Customer): Promise<GotCustomerDetailDto> {
    const gotCustomer = await this.customerService.getDetailById(user?.id);

    return gotCustomer;
  }

  @InjectRoute(customerRoutes.updateMe)
  public async updateMe(
    @ReqUser() user: IJwtStrategy,
    @Body() data: UpdateCustomerDto,
  ): Promise<UpdatedCustomerDto> {
    const updatedCustomer = await this.customerService.updateByCustomer({
      customer: <Customer>user.element,
      data,
    });

    return updatedCustomer;
  }

  @InjectRoute(customerRoutes.getById)
  public async getById(@Param('id') id: string): Promise<GotCustomerDetailDto> {
    const gotCustomer = await this.customerService.getDetailById(id);

    return gotCustomer;
  }

  @InjectRoute(customerRoutes.updateById)
  public async updateById(
    @Param('id') id: string,
    @Body() data: UpdateCustomerDto,
  ): Promise<GotCustomerDto> {
    const updatedCustomer = await this.customerService.updateById({
      id,
      data,
    });

    return updatedCustomer;
  }

  @InjectRoute(customerRoutes.deleteById)
  public async deleteById(@Param('id') id: string): Promise<string> {
    await this.customerService.deleteById(id);

    return id;
  }
}
