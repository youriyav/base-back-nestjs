import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the additions + addition_items tables — an addition is recorded
 * when the cashier prints the bill (a snapshot of the order at that
 * moment), distinct from a Sale, which is now recorded separately at actual
 * payment confirmation. Same shape/conventions as sales/sale_items
 * (including cashier_id, added to that table in a later migration — here
 * included from the start): clientId is the mobile offline-queue
 * idempotency key, enforced by the soft-delete-aware partial unique index
 * below, same pattern as UQ_sales_restaurant_client.
 */
export class CreateAdditions1789770000000 implements MigrationInterface {
  name = 'CreateAdditions1789770000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "additions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                "createdBy" uuid,
                "updatedBy" uuid,
                "deletedBy" uuid,
                "restaurant_id" uuid NOT NULL,
                "client_id" character varying NOT NULL,
                "table_id" uuid,
                "table_label" character varying NOT NULL,
                "server_name" character varying,
                "cashier_id" uuid,
                "total" integer NOT NULL,
                "printed_at" TIMESTAMP NOT NULL,
                CONSTRAINT "PK_additions" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "additions"
            ADD CONSTRAINT "FK_additions_restaurant" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "additions"
            ADD CONSTRAINT "FK_additions_table" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "additions"
            ADD CONSTRAINT "FK_additions_cashier" FOREIGN KEY ("cashier_id") REFERENCES "users_table"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_additions_restaurant_client" ON "additions" ("restaurant_id", "client_id") WHERE "deletedAt" IS NULL
        `);

    await queryRunner.query(`
            CREATE TABLE "addition_items" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                "createdBy" uuid,
                "updatedBy" uuid,
                "deletedBy" uuid,
                "addition_id" uuid NOT NULL,
                "menu_item_id" uuid,
                "name" character varying NOT NULL,
                "unit_price" integer NOT NULL,
                "quantity" integer NOT NULL,
                CONSTRAINT "PK_addition_items" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "addition_items"
            ADD CONSTRAINT "FK_addition_items_addition" FOREIGN KEY ("addition_id") REFERENCES "additions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "addition_items" DROP CONSTRAINT "FK_addition_items_addition"
        `);
    await queryRunner.query(`
            DROP TABLE "addition_items"
        `);
    await queryRunner.query(`
            DROP INDEX "UQ_additions_restaurant_client"
        `);
    await queryRunner.query(`
            ALTER TABLE "additions" DROP CONSTRAINT "FK_additions_cashier"
        `);
    await queryRunner.query(`
            ALTER TABLE "additions" DROP CONSTRAINT "FK_additions_table"
        `);
    await queryRunner.query(`
            ALTER TABLE "additions" DROP CONSTRAINT "FK_additions_restaurant"
        `);
    await queryRunner.query(`
            DROP TABLE "additions"
        `);
  }
}
