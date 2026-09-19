import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Locks down restaurant_id now that every existing row has been backfilled.
 * Run ONLY after confirming zero orphans:
 *
 *   SELECT count(*) FROM users_table WHERE restaurant_id IS NULL AND "isAdmin" = false;
 *   SELECT count(*) FROM menu_categories WHERE restaurant_id IS NULL;
 *   SELECT count(*) FROM menu_items WHERE restaurant_id IS NULL;
 *
 * users_table.restaurant_id intentionally stays NULLABLE at the column level
 * (SUPER_ADMIN accounts, isAdmin=true, must have no restaurant) but gets a
 * CHECK constraint that is stricter than a bare NOT NULL: it also forbids the
 * "non-admin user with no restaurant" data-integrity bug that NOT NULL alone
 * wouldn't catch any better once nullable-for-one-role is a requirement.
 * Keyed off "isAdmin" (not "role") — see AddRestaurantIdToUsers migration.
 */
export class EnforceRestaurantIdConstraints1789600160094 implements MigrationInterface {
  name = 'EnforceRestaurantIdConstraints1789600160094';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "menu_categories" ALTER COLUMN "restaurant_id" SET NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "menu_items" ALTER COLUMN "restaurant_id" SET NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "users_table"
            ADD CONSTRAINT "CHK_users_restaurant_required"
            CHECK (
                ("isAdmin" = true AND "restaurant_id" IS NULL)
                OR ("isAdmin" = false AND "restaurant_id" IS NOT NULL)
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users_table" DROP CONSTRAINT "CHK_users_restaurant_required"
        `);
    await queryRunner.query(`
            ALTER TABLE "menu_items" ALTER COLUMN "restaurant_id" DROP NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "menu_categories" ALTER COLUMN "restaurant_id" DROP NOT NULL
        `);
  }
}
