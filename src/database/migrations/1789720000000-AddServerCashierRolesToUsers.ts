import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the 'server' and 'cashier' literal role values, used by restaurant
 * personnel who authenticate on the mobile app via phone + 4-digit code
 * (stored in the existing `password` column, just validated differently).
 */
export class AddServerCashierRolesToUsers1789720000000 implements MigrationInterface {
  name = 'AddServerCashierRolesToUsers1789720000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TYPE "public"."users_table_role_enum" ADD VALUE IF NOT EXISTS 'server'
        `);
    await queryRunner.query(`
            ALTER TYPE "public"."users_table_role_enum" ADD VALUE IF NOT EXISTS 'cashier'
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres has no DROP VALUE — rebuild the enum type without 'server'/'cashier'.
    await queryRunner.query(`
            ALTER TYPE "public"."users_table_role_enum" RENAME TO "users_table_role_enum_old"
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."users_table_role_enum" AS ENUM(
                'super_admin',
                'admin',
                'staff',
                'owner',
                'member',
                'user'
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "users_table"
            ALTER COLUMN "role" TYPE "public"."users_table_role_enum" USING "role"::text::"public"."users_table_role_enum"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."users_table_role_enum_old"
        `);
  }
}
