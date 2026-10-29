// Frozen: migrations must not import app code, which changes over time.
import { Table, QueryRunner, MigrationInterface } from 'typeorm';

export class Customer1663056182454 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'customers',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'password',
            type: 'varchar',
          },
          {
            name: 'first_name',
            type: 'varchar',
          },
          {
            name: 'last_name',
            type: 'varchar',
          },
          {
            name: 'bod',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'gender',
            type: 'enum',
            enum: ['0', '1', '2'],
            enumName: 'gender_type_enum',
            isNullable: true,
          },
          {
            name: 'phone_number',
            type: 'varchar',
            isUnique: true,
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
    await queryRunner.dropTable('customers');
  }
}
