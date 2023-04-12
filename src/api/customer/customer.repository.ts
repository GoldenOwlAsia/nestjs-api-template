import { Repository } from 'typeorm';

import { Customer } from './entities/customer.entity';

export class CustomerRepository extends Repository<Customer> {}
