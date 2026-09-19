import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * OWNER accounts created before phone+code mobile login was added have no
 * access_code (only SERVER/CASHIER got one generated at creation time until
 * now). Backfills a random 4-digit code for any OWNER still missing one, so
 * every existing OWNER can also log into the mobile app.
 */
export class BackfillOwnerAccessCodes1789740000001 implements MigrationInterface {
  name = 'BackfillOwnerAccessCodes1789740000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE "users_table"
            SET "access_code" = LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0')
            WHERE "role" = 'owner' AND "access_code" IS NULL
        `);
  }

  public async down(): Promise<void> {
    // Not reversible: we can't tell a backfilled code apart from one that
    // existed already, so `down` intentionally leaves access codes in place.
  }
}
