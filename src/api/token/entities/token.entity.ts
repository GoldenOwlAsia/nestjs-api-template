import { Exclude } from 'class-transformer';
import { BeforeInsert, BeforeUpdate, Column, Entity } from 'typeorm';

import { entity } from '@/utils/helpers';
import { UserRole } from '@/common/enums';
import { Base as BaseEntity } from '@/common/entities';

@Entity({ name: 'tokens' })
export class Token extends BaseEntity {
  @Exclude()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Exclude()
  @Column({
    type: 'enum',
    enum: UserRole,
    name: 'user_role',
    default: UserRole.CUSTOMER,
  })
  userRole: UserRole;

  @Exclude()
  @Column({ name: 'access_token' })
  accessToken: string;

  @Exclude()
  @Column({ name: 'refresh_token' })
  refreshToken: string;

  private parseRoleBeforeAction(): void {
    const plainUserRole = this.userRole ?? 'CUSTOMER';

    if (
      entity.isValidFieldBeforeParse({ data: UserRole, value: plainUserRole })
    ) {
      this.userRole = Number(UserRole?.[plainUserRole]);
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  private formatInsertedData(): void {
    this.parseRoleBeforeAction();
  }
}
