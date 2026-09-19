import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates table_order_items — an insert-only log of "add this dish to this
 * table" events, used to persist a table's in-progress order server-side
 * (previously tracked only in the mobile app's in-memory cache, lost on any
 * process kill). Each row is one add event, never updated in place; the
 * current order for a table is derived by summing quantity per menu item
 * (see TablesService.findAll). clientId is the mobile offline-queue
 * idempotency key, same soft-delete-aware partial unique index pattern as
 * UQ_sales_restaurant_client / UQ_additions_restaurant_client.
 */
export class CreateTableOrderItems1789806220000 implements MigrationInterface {
  name = 'CreateTableOrderItems1789806220000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "table_order_items" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                "createdBy" uuid,
                "updatedBy" uuid,
                "deletedBy" uuid,
                "restaurant_id" uuid NOT NULL,
                "client_id" character varying NOT NULL,
                "table_id" uuid NOT NULL,
                "menu_item_id" uuid,
                "name" character varying NOT NULL,
                "unit_price" integer NOT NULL,
                "quantity" integer NOT NULL,
                CONSTRAINT "PK_table_order_items" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "table_order_items"
            ADD CONSTRAINT "FK_table_order_items_restaurant" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "table_order_items"
            ADD CONSTRAINT "FK_table_order_items_table" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_table_order_items_restaurant_client" ON "table_order_items" ("restaurant_id", "client_id") WHERE "deletedAt" IS NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX "UQ_table_order_items_restaurant_client"
        `);
    await queryRunner.query(`
            ALTER TABLE "table_order_items" DROP CONSTRAINT "FK_table_order_items_table"
        `);
    await queryRunner.query(`
            ALTER TABLE "table_order_items" DROP CONSTRAINT "FK_table_order_items_restaurant"
        `);
    await queryRunner.query(`
            DROP TABLE "table_order_items"
        `);
  }
}
