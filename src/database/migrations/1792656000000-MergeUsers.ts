import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Merges `admins` and `customers` into one `users` table with a `role` column,
 * moves gender/role to string enums, and points `tokens.user_id` at `users`.
 * Ids are kept, so existing sessions keep working.
 */
export class MergeUsers1792656000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Refuse rather than silently drop one of two clashing accounts.
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM admins a JOIN customers c
            ON a.email = c.email OR a.phone_number = c.phone_number OR a.id = c.id
        ) THEN
          RAISE EXCEPTION 'Cannot merge admins and customers: some share an email, phone number or id. Resolve those rows first.';
        END IF;
      END $$`);

    await queryRunner.query(
      `CREATE TYPE "user_role_enum" AS ENUM ('CUSTOMER', 'ADMIN')`,
    );
    await queryRunner.query(
      `CREATE TYPE "user_gender_enum" AS ENUM ('MALE', 'FEMALE', 'OTHER')`,
    );
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamp NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone,
        "updated_at" timestamp NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone,
        "email" varchar NOT NULL,
        "password" varchar NOT NULL,
        "first_name" varchar NOT NULL,
        "last_name" varchar NOT NULL,
        "bod" date,
        "gender" "user_gender_enum",
        "phone_number" varchar NOT NULL,
        "role" "user_role_enum" NOT NULL DEFAULT 'CUSTOMER',
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "UQ_users_phone_number" UNIQUE ("phone_number")
      )`);

    // Old gender values were '0' | '1' | '2'.
    for (const [table, role] of [
      ['customers', 'CUSTOMER'],
      ['admins', 'ADMIN'],
    ]) {
      await queryRunner.query(`
        INSERT INTO "users" ("id", "created_at", "updated_at", "email", "password",
          "first_name", "last_name", "bod", "gender", "phone_number", "role")
        SELECT "id"::uuid, "created_at", "updated_at", "email", "password",
          "first_name", "last_name", "bod",
          (ARRAY['MALE', 'FEMALE', 'OTHER'])["gender"::text::int + 1]::"user_gender_enum",
          "phone_number", '${role}'
        FROM "${table}"`);
    }

    await queryRunner.query(
      `DELETE FROM "tokens" t WHERE NOT EXISTS (SELECT 1 FROM "users" u WHERE u."id" = t."user_id")`,
    );
    await queryRunner.query(`ALTER TABLE "tokens" DROP COLUMN "user_role"`);
    await queryRunner.query(`DROP TYPE "customer_user_role_enum"`);
    await queryRunner.query(
      `ALTER TABLE "tokens" ALTER COLUMN "user_id" DROP DEFAULT`,
    );
    // Constraint name = TypeORM's generated one, so `migration:generate` sees no drift.
    await queryRunner.query(
      `ALTER TABLE "tokens" ADD CONSTRAINT "FK_8769073e38c365f315426554ca5" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );

    await queryRunner.query(`DROP TABLE "admins"`);
    await queryRunner.query(`DROP TABLE "customers"`);
    await queryRunner.query(`DROP TYPE "gender_type_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "gender_type_enum" AS ENUM ('0', '1', '2')`,
    );

    for (const [table, role] of [
      ['customers', 'CUSTOMER'],
      ['admins', 'ADMIN'],
    ]) {
      await queryRunner.query(`
        CREATE TABLE "${table}" (
          "id" varchar NOT NULL DEFAULT uuid_generate_v4(),
          "email" varchar NOT NULL,
          "password" varchar NOT NULL,
          "first_name" varchar NOT NULL,
          "last_name" varchar NOT NULL,
          "bod" date,
          "gender" "gender_type_enum",
          "phone_number" varchar NOT NULL,
          "created_at" timestamp NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone,
          "updated_at" timestamp NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone,
          CONSTRAINT "PK_${table}_id" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_${table}_email" UNIQUE ("email"),
          CONSTRAINT "UQ_${table}_phone_number" UNIQUE ("phone_number")
        )`);
      await queryRunner.query(`
        INSERT INTO "${table}" ("id", "email", "password", "first_name", "last_name",
          "bod", "gender", "phone_number", "created_at", "updated_at")
        SELECT "id"::varchar, "email", "password", "first_name", "last_name", "bod",
          (array_position(ARRAY['MALE', 'FEMALE', 'OTHER'], "gender"::text) - 1)::text::"gender_type_enum",
          "phone_number", "created_at", "updated_at"
        FROM "users" WHERE "role" = '${role}'`);
    }

    await queryRunner.query(
      `ALTER TABLE "tokens" DROP CONSTRAINT "FK_8769073e38c365f315426554ca5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tokens" ALTER COLUMN "user_id" SET DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `CREATE TYPE "customer_user_role_enum" AS ENUM ('0', '1')`,
    );
    await queryRunner.query(
      `ALTER TABLE "tokens" ADD "user_role" "customer_user_role_enum" NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(`
      UPDATE "tokens" t SET "user_role" = '1'
      FROM "users" u WHERE u."id" = t."user_id" AND u."role" = 'ADMIN'`);

    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "user_gender_enum"`);
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
  }
}
