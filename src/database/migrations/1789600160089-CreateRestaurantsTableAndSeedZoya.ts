import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the restaurants table (the tenant root) and seeds the one restaurant
 * that owns all data existing in this database today: Zoya. The id is a fixed
 * literal (not generated at migration time) so later migrations in this same
 * multi-tenant rollout can reference it directly in their backfill UPDATEs
 * without a runtime SELECT.
 */
export class CreateRestaurantsTableAndSeedZoya1789600160089 implements MigrationInterface {
  name = 'CreateRestaurantsTableAndSeedZoya1789600160089';

  /** Fixed id for the Zoya restaurant row, referenced by later migrations. */
  static readonly ZOYA_RESTAURANT_ID = 'aaf5b1e9-1946-45b0-a4d1-8b098ee28252';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."restaurants_plan_enum" AS ENUM('essentiel', 'pro', 'business')
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."restaurants_status_enum" AS ENUM('active', 'trial', 'suspended')
        `);
    await queryRunner.query(`
            CREATE TABLE "restaurants" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                "createdBy" uuid,
                "updatedBy" uuid,
                "deletedBy" uuid,
                "name" character varying NOT NULL,
                "slug" character varying NOT NULL,
                "city" character varying NOT NULL DEFAULT 'Bangui',
                "plan" "public"."restaurants_plan_enum" NOT NULL DEFAULT 'essentiel',
                "status" "public"."restaurants_status_enum" NOT NULL DEFAULT 'trial',
                CONSTRAINT "UQ_restaurants_slug" UNIQUE ("slug"),
                CONSTRAINT "PK_restaurants" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(
      `
            INSERT INTO "restaurants" ("id", "name", "slug", "city", "plan", "status")
            VALUES ($1, 'Zoya', 'zoya', 'Bangui', 'business', 'active')
        `,
      [CreateRestaurantsTableAndSeedZoya1789600160089.ZOYA_RESTAURANT_ID],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "restaurants"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."restaurants_status_enum"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."restaurants_plan_enum"
        `);
  }
}
