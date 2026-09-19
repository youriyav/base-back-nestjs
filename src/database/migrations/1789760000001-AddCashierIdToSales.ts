import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds cashierId to sales — the actual authenticated user who called
 * POST /sales (set server-side from the JWT, never from the client body),
 * distinct from the free-text serverName snapshot. Needed to filter the
 * "Ventes" list by cashier.
 */
export class AddCashierIdToSales1789760000001 implements MigrationInterface {
  name = 'AddCashierIdToSales1789760000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "sales" ADD COLUMN "cashier_id" uuid
        `);
    await queryRunner.query(`
            ALTER TABLE "sales"
            ADD CONSTRAINT "FK_sales_cashier" FOREIGN KEY ("cashier_id") REFERENCES "users_table"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "sales" DROP CONSTRAINT "FK_sales_cashier"
        `);
    await queryRunner.query(`
            ALTER TABLE "sales" DROP COLUMN "cashier_id"
        `);
  }
}
