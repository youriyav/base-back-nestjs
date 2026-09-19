import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds an optional assigned-staff link on tables (which staff member is
 * currently serving it), nullable — most tables have none assigned.
 * References users_table (the actual table name behind the User entity).
 */
export class AddAssignedStaffToTables1789710000000 implements MigrationInterface {
  name = 'AddAssignedStaffToTables1789710000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "tables" ADD COLUMN "assigned_staff_id" uuid
        `);
    await queryRunner.query(`
            ALTER TABLE "tables"
            ADD CONSTRAINT "FK_tables_assigned_staff" FOREIGN KEY ("assigned_staff_id") REFERENCES "users_table"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "tables" DROP CONSTRAINT "FK_tables_assigned_staff"
        `);
    await queryRunner.query(`
            ALTER TABLE "tables" DROP COLUMN "assigned_staff_id"
        `);
  }
}
