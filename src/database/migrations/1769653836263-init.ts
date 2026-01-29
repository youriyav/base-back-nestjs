import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1769653836263 implements MigrationInterface {
    name = 'Init1769653836263'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "public"."users_table_role_enum" AS ENUM(
                'super_admin',
                'admin',
                'staff',
                'owner',
                'member',
                'user'
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "users_table" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "first_name" character varying NOT NULL,
                "last_name" character varying NOT NULL,
                "email" character varying NOT NULL,
                "phone" character varying NOT NULL,
                "password" character varying(255) NOT NULL,
                "address" character varying,
                "isActivate" boolean,
                "isAdmin" boolean NOT NULL DEFAULT false,
                "role" "public"."users_table_role_enum",
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                "createdBy" uuid,
                "updatedBy" uuid,
                "deletedBy" uuid,
                CONSTRAINT "PK_c50d83972fb8fa9d6cddcae7201" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "password_reset_tokens" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "token_hash" character varying(255) NOT NULL,
                "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "used_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_d16bebd73e844c48bca50ff8d3d" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_d49d2c07feb2172141c3102c2e" ON "password_reset_tokens" ("user_id", "used_at")
        `);
        await queryRunner.query(`
            CREATE TABLE "audit_logs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid,
                "action" character varying(100) NOT NULL,
                "entity" character varying(100) NOT NULL,
                "entity_id" uuid,
                "method" character varying(10) NOT NULL,
                "path" character varying(500) NOT NULL,
                "ip_address" character varying(45) NOT NULL,
                "user_agent" text,
                "payload" jsonb,
                "status_code" integer,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_82edbc5f8a1821ff01b8b9c865" ON "audit_logs" ("entity", "entity_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_2cd10fda8276bb995288acfbfb" ON "audit_logs" ("created_at")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_cee5459245f652b75eb2759b4c" ON "audit_logs" ("action")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_bd2726fd31b35443f2245b93ba" ON "audit_logs" ("user_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "password_reset_tokens"
            ADD CONSTRAINT "FK_52ac39dd8a28730c63aeb428c9c" FOREIGN KEY ("user_id") REFERENCES "users_table"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "FK_52ac39dd8a28730c63aeb428c9c"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_bd2726fd31b35443f2245b93ba"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_cee5459245f652b75eb2759b4c"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_2cd10fda8276bb995288acfbfb"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_82edbc5f8a1821ff01b8b9c865"
        `);
        await queryRunner.query(`
            DROP TABLE "audit_logs"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_d49d2c07feb2172141c3102c2e"
        `);
        await queryRunner.query(`
            DROP TABLE "password_reset_tokens"
        `);
        await queryRunner.query(`
            DROP TABLE "users_table"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."users_table_role_enum"
        `);
    }

}
