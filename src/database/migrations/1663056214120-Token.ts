import { Table, QueryRunner, MigrationInterface } from 'typeorm';

import { enumh } from '@/utils/helpers';
import { UserRole } from '@/common/enums';

export class Token1663056214120 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tokens',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_role',
            type: 'enum',
            enum: enumh.getValuesAndToString<typeof UserRole>(UserRole),
            enumName: 'customer_user_role_enum',
            default: `'0'::customer_user_role_enum`,
          },
          {
            name: 'access_token',
            type: 'varchar',
          },
          {
            name: 'refresh_token',
            type: 'varchar',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: `('now'::text)::timestamp(6) with time zone`,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: `('now'::text)::timestamp(6) with time zone`,
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tokens');
  }
}
