import { MigrationInterface, QueryRunner } from 'typeorm';
import { CreateRestaurantsTableAndSeedZoya1789600160089 as SeedZoya } from './1789600160089-CreateRestaurantsTableAndSeedZoya';

/**
 * Adds restaurant_id to users_table as NULLABLE and backfills every existing
 * non-super-admin user to Zoya. Deliberately keyed off "isAdmin", not "role":
 * AuthService.getUserRole() treats isAdmin=true as SUPER_ADMIN regardless of
 * the stored role column, so isAdmin is the real signal for "belongs to no
 * restaurant". Rows with isAdmin=true are left NULL on purpose.
 *
 * Stays nullable here — the NOT NULL / CHECK constraint is a separate later
 * migration, run only after the orphan-count verification gate passes.
 */
export class AddRestaurantIdToUsers1789600160090 implements MigrationInterface {
  name = 'AddRestaurantIdToUsers1789600160090';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users_table" ADD COLUMN "restaurant_id" uuid
        `);
    await queryRunner.query(`
            ALTER TABLE "users_table"
            ADD CONSTRAINT "FK_users_restaurant" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);

    await queryRunner.query(
      `
            UPDATE "users_table" SET "restaurant_id" = $1 WHERE "isAdmin" = false
        `,
      [SeedZoya.ZOYA_RESTAURANT_ID],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users_table" DROP CONSTRAINT "FK_users_restaurant"
        `);
    await queryRunner.query(`
            ALTER TABLE "users_table" DROP COLUMN "restaurant_id"
        `);
  }
}
