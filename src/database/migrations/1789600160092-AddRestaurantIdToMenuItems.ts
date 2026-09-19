import { MigrationInterface, QueryRunner } from 'typeorm';
import { CreateRestaurantsTableAndSeedZoya1789600160089 as SeedZoya } from './1789600160089-CreateRestaurantsTableAndSeedZoya';

/**
 * Adds restaurant_id to menu_items as NULLABLE and backfills every existing
 * row to Zoya. Stored directly on menu_items (not only derivable via
 * category_id) so tenant scoping never depends on a join being present or
 * correct, even though it's implied transitively via the category today.
 */
export class AddRestaurantIdToMenuItems1789600160092 implements MigrationInterface {
  name = 'AddRestaurantIdToMenuItems1789600160092';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "menu_items" ADD COLUMN "restaurant_id" uuid
        `);
    await queryRunner.query(`
            ALTER TABLE "menu_items"
            ADD CONSTRAINT "FK_menu_items_restaurant" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);

    await queryRunner.query(
      `
            UPDATE "menu_items" SET "restaurant_id" = $1
        `,
      [SeedZoya.ZOYA_RESTAURANT_ID],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "menu_items" DROP CONSTRAINT "FK_menu_items_restaurant"
        `);
    await queryRunner.query(`
            ALTER TABLE "menu_items" DROP COLUMN "restaurant_id"
        `);
  }
}
