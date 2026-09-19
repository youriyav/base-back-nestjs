import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Plain 4-digit mobile login PIN for SERVER/CASHIER personnel, separate from
 * the bcrypt-hashed `password` column so it can be revealed to the admin on
 * demand ("Afficher") rather than only shown once at creation.
 */
export class AddAccessCodeToUsers1789730000000 implements MigrationInterface {
  name = 'AddAccessCodeToUsers1789730000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users_table" ADD COLUMN "access_code" character varying(4)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users_table" DROP COLUMN "access_code"
        `);
  }
}
