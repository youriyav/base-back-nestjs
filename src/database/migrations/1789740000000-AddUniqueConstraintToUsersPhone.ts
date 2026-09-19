import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phone+code mobile login (POST /auth/login-phone) looks up a user by phone
 * alone, so phone must resolve to at most one account. Fails at migration
 * time if duplicate phone numbers already exist in the data — that's the
 * accepted risk of the "global unique constraint" choice over a per-restaurant
 * one.
 */
export class AddUniqueConstraintToUsersPhone1789740000000 implements MigrationInterface {
  name = 'AddUniqueConstraintToUsersPhone1789740000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users_table" ADD CONSTRAINT "UQ_users_phone" UNIQUE ("phone")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users_table" DROP CONSTRAINT "UQ_users_phone"
        `);
  }
}
