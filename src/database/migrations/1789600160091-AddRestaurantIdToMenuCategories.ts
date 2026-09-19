import { MigrationInterface, QueryRunner } from 'typeorm';
import { CreateRestaurantsTableAndSeedZoya1789600160089 as SeedZoya } from './1789600160089-CreateRestaurantsTableAndSeedZoya';

/**
 * Adds restaurant_id to menu_categories as NULLABLE and backfills every
 * existing row to Zoya (no exceptions here — unlike users_table, every
 * category belongs to exactly one restaurant).
 */
export class AddRestaurantIdToMenuCategories1789600160091 implements MigrationInterface {
  name = 'AddRestaurantIdToMenuCategories1789600160091';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "menu_categories" ADD COLUMN "restaurant_id" uuid
        `);
    await queryRunner.query(`
            ALTER TABLE "menu_categories"
            ADD CONSTRAINT "FK_menu_categories_restaurant" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);

    await queryRunner.query(
      `
            UPDATE "menu_categories" SET "restaurant_id" = $1
        `,
      [SeedZoya.ZOYA_RESTAURANT_ID],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "menu_categories" DROP CONSTRAINT "FK_menu_categories_restaurant"
        `);
    await queryRunner.query(`
            ALTER TABLE "menu_categories" DROP COLUMN "restaurant_id"
        `);
  }
}
