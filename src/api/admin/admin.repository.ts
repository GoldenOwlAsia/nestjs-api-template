import { Repository } from 'typeorm';

import { Admin } from './entities/admin.entity';

export class AdminRepository extends Repository<Admin> {}
