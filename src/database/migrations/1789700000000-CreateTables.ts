import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the tables table (physical dining tables owned by a restaurant).
 * Brand-new table, so restaurant_id is NOT NULL from the start — no backfill
 * needed, unlike the earlier retrofit migrations on menu_categories/users.
 */
export class CreateTables1789700000000 implements MigrationInterface {
  name = 'CreateTables1789700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."tables_etat_enum" AS ENUM('libre', 'occupee', 'addition', 'reservee')
        `);
    await queryRunner.query(`
            CREATE TABLE "tables" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                "createdBy" uuid,
                "updatedBy" uuid,
                "deletedBy" uuid,
                "nom" character varying NOT NULL,
                "emplacement" character varying,
                "capacite" integer NOT NULL,
                "etat" "public"."tables_etat_enum" NOT NULL DEFAULT 'libre',
                "restaurant_id" uuid NOT NULL,
                CONSTRAINT "PK_tables" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "tables"
            ADD CONSTRAINT "FK_tables_restaurant" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "tables" DROP CONSTRAINT "FK_tables_restaurant"
        `);
    await queryRunner.query(`
            DROP TABLE "tables"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."tables_etat_enum"
        `);
  }
}
