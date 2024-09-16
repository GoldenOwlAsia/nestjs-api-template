import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

import { AdminService } from '@/api/admin/admin.service';

@Injectable()
export class SelfGuard implements CanActivate {
  constructor(private adminService: AdminService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const params = request.params;

    const userAccount = await this.adminService.findOneByEmail(user?.email);

    return userAccount && userAccount.id === params.id;
  }
}
