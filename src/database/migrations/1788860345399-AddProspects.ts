import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProspects1788860345399 implements MigrationInterface {
    name = 'AddProspects1788860345399'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "public"."demo_requests_desiredplan_enum" AS ENUM('essentiel', 'pro', 'business', 'unsure')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."demo_requests_status_enum" AS ENUM('new', 'contacted', 'converted', 'discarded')
        `);
        await queryRunner.query(`
            CREATE TABLE "demo_requests" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                "createdBy" uuid,
                "updatedBy" uuid,
                "deletedBy" uuid,
                "restaurantName" character varying NOT NULL,
                "contactName" character varying NOT NULL,
                "phone" character varying NOT NULL,
                "email" character varying,
                "city" character varying NOT NULL DEFAULT 'Bangui',
                "desiredPlan" "public"."demo_requests_desiredplan_enum" NOT NULL DEFAULT 'unsure',
                "message" text,
                "status" "public"."demo_requests_status_enum" NOT NULL DEFAULT 'new',
                CONSTRAINT "PK_caebe842f55969080ee55adf186" PRIMARY KEY ("id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE "demo_requests"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."demo_requests_status_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."demo_requests_desiredplan_enum"
        `);
    }

}
