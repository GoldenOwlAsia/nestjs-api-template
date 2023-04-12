import { omit } from 'ramda';
import { Exclude } from 'class-transformer';

import { Column, Entity, BeforeInsert, BeforeUpdate } from 'typeorm';

import { entity, hash } from '@/utils/helpers';
import { Gender, UserRole } from '@/common/enums';
import { Base as BaseEntity } from '@/common/entities';

import type { Token } from '@/api/token/entities';

@Entity({ name: 'customers' })
export class Customer extends BaseEntity {
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
    nullable: true,
  })
  gender?: Gender;

  @Column({ name: 'phone_number', unique: true })
  phoneNumber: string;

  private parseGenderBeforeAction(): void {
    if (this.gender) {
      const plainGender = this.gender ?? Gender[Gender.MALE];

      if (
        entity.isValidFieldBeforeParse({ data: Gender, value: plainGender })
      ) {
        this.gender = Number(Gender?.[plainGender]);
      }
    }
  }

  @BeforeInsert()
  private async setInsertingData(): Promise<void> {
    const saltRounds = 10;

    this.password = await hash.generateWithBcrypt({
      source: this.password,
      salt: saltRounds,
    });

    this.parseGenderBeforeAction();
  }

  @BeforeUpdate()
  private async setUpdatingData(): Promise<void> {
    this.parseGenderBeforeAction();
  }

  public fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  public toResponse(): Omit<
    this,
    'password' | 'setInsertingData' | 'setUpdatingData'
  > & {
    role: string;
    gender: string;
  } {
    return {
      ...omit(['password', 'setInsertingData', 'setUpdatingData'], this),
      role: UserRole[UserRole.CUSTOMER],
      gender: Gender[this.gender] || null,
    };
  }

  public toResponseHavingSessions(sessions: Token[]): Omit<
    this,
    'password' | 'setInsertingData' | 'setUpdatingData'
  > & {
    role: string;
    gender: string;
    sessions: Token[];
  } {
    return {
      ...this.toResponse(),
      sessions,
    };
  }
}
