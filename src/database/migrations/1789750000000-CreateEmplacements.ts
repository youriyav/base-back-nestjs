import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the emplacements table (named locations/zones a restaurant's
 * tables can belong to, e.g. "Terrasse", "Salle principale"). Brand-new
 * table, so restaurant_id is NOT NULL from the start.
 */
export class CreateEmplacements1789750000000 implements MigrationInterface {
  name = 'CreateEmplacements1789750000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "emplacements" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                "createdBy" uuid,
                "updatedBy" uuid,
                "deletedBy" uuid,
                "name" character varying NOT NULL,
                "restaurant_id" uuid NOT NULL,
                "order" integer NOT NULL DEFAULT 0,
                CONSTRAINT "PK_emplacements" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "emplacements"
            ADD CONSTRAINT "FK_emplacements_restaurant" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "emplacements"
            ADD CONSTRAINT "UQ_emplacements_restaurant_name" UNIQUE ("restaurant_id", "name")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "emplacements" DROP CONSTRAINT "UQ_emplacements_restaurant_name"
        `);
    await queryRunner.query(`
            ALTER TABLE "emplacements" DROP CONSTRAINT "FK_emplacements_restaurant"
        `);
    await queryRunner.query(`
            DROP TABLE "emplacements"
        `);
  }
}
