import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * menu_categories.slug was globally unique, which would prevent two different
 * restaurants from both having e.g. a "boissons" category. Replaces it with a
 * composite unique constraint scoped per restaurant.
 *
 * Live constraint name verified directly against the target database before
 * writing this migration (matches migration history, no drift):
 *   SELECT conname FROM pg_constraint WHERE conrelid = 'menu_categories'::regclass;
 *   -> UQ_8ab84c66494fac71932bb9a4381  UNIQUE (slug)
 */
export class FixMenuCategorySlugUniqueness1789600160093 implements MigrationInterface {
  name = 'FixMenuCategorySlugUniqueness1789600160093';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "menu_categories" DROP CONSTRAINT "UQ_8ab84c66494fac71932bb9a4381"
        `);
    await queryRunner.query(`
            ALTER TABLE "menu_categories"
            ADD CONSTRAINT "UQ_menu_categories_restaurant_slug" UNIQUE ("restaurant_id", "slug")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "menu_categories" DROP CONSTRAINT "UQ_menu_categories_restaurant_slug"
        `);
    // NOTE: this will fail if more than one restaurant now shares a slug —
    // an expected and acceptable limitation of rolling back a multi-tenant
    // migration back to a single-tenant uniqueness rule.
    await queryRunner.query(`
            ALTER TABLE "menu_categories"
            ADD CONSTRAINT "UQ_8ab84c66494fac71932bb9a4381" UNIQUE ("slug")
        `);
  }
}
