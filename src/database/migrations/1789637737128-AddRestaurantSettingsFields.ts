import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds address/phone/logo columns to restaurants, all nullable — additive,
 * no backfill needed. Backs the restaurant "paramètres" settings page
 * (address, phone, logo), which previously only persisted name/city.
 */
export class AddRestaurantSettingsFields1789637737128 implements MigrationInterface {
  name = 'AddRestaurantSettingsFields1789637737128';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "restaurants"
            ADD COLUMN "address" character varying,
            ADD COLUMN "phone" character varying,
            ADD COLUMN "logo_url" character varying,
            ADD COLUMN "logo_object_key" character varying
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "restaurants"
            DROP COLUMN "address",
            DROP COLUMN "phone",
            DROP COLUMN "logo_url",
            DROP COLUMN "logo_object_key"
        `);
  }
}
