import { Exclude } from 'class-transformer';
import { BeforeInsert, Column, Entity } from 'typeorm';

import { hash } from '@/utils/helpers';
import { Gender, UserRole } from '@/common/enums';
import { Base as BaseEntity } from '@/common/entities';

import type { Token } from '@/api/token/entities';

@Entity({ name: 'users' })
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ type: 'date', nullable: true })
  bod?: Date;

  @Column({
    type: 'enum',
    enum: Gender,
    enumName: 'user_gender_enum',
    nullable: true,
  })
  gender?: Gender;

  @Column({ name: 'phone_number', unique: true })
  phoneNumber: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role_enum',
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  // Insert only: update paths hash explicitly (UsersService.update).
  @BeforeInsert()
  private async hashPassword(): Promise<void> {
    this.password = await hash.generateWithBcrypt({
      source: this.password,
      salt: 10,
    });
  }

  public fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  public toResponse() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...rest } = this;

    return rest;
  }

  public toResponseHavingSessions(sessions: Token[]) {
    return { ...this.toResponse(), sessions };
  }
}
