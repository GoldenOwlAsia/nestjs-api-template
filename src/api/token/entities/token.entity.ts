import { Exclude } from 'class-transformer';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { Base as BaseEntity } from '@/common/entities';

import type { User } from '@/api/users/entities';

/** One row per login session; its id is the `sid` JWT claim. */
@Entity({ name: 'tokens' })
export class Token extends BaseEntity {
  @Exclude()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  /** sha256 digest, never the raw token. */
  @Exclude()
  @Column({ name: 'access_token' })
  accessToken: string;

  /** sha256 digest, never the raw token. */
  @Exclude()
  @Column({ name: 'refresh_token' })
  refreshToken: string;
}
