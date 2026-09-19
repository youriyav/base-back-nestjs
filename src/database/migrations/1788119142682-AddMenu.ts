import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMenu1788119142682 implements MigrationInterface {
    name = 'AddMenu1788119142682'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "menu_categories" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                "createdBy" uuid,
                "updatedBy" uuid,
                "deletedBy" uuid,
                "name" character varying NOT NULL,
                "slug" character varying NOT NULL,
                "icon" character varying,
                "order" integer NOT NULL DEFAULT '0',
                CONSTRAINT "UQ_8ab84c66494fac71932bb9a4381" UNIQUE ("slug"),
                CONSTRAINT "PK_124ae987900336f983881cb04e6" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "menu_items" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                "createdBy" uuid,
                "updatedBy" uuid,
                "deletedBy" uuid,
                "name" character varying NOT NULL,
                "category_id" uuid NOT NULL,
                "price" integer NOT NULL,
                "unit" character varying,
                "description" text,
                "image_url" character varying,
                "image_object_key" character varying,
                "isAvailable" boolean NOT NULL DEFAULT true,
                "order" integer NOT NULL DEFAULT '0',
                CONSTRAINT "PK_57e6188f929e5dc6919168620c8" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "menu_items"
            ADD CONSTRAINT "FK_20cff56c44dd4fe52d5aa2b96f8" FOREIGN KEY ("category_id") REFERENCES "menu_categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "menu_items" DROP CONSTRAINT "FK_20cff56c44dd4fe52d5aa2b96f8"
        `);
        await queryRunner.query(`
            DROP TABLE "menu_items"
        `);
        await queryRunner.query(`
            DROP TABLE "menu_categories"
        `);
    }

}
