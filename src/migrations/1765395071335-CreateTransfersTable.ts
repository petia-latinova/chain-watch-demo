import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTransfersTable1765395071335 implements MigrationInterface {
    name = 'CreateTransfersTable1765395071335'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "transfers" ("transactionHash" character varying(66) NOT NULL, "contractAddress" character varying(42) NOT NULL, "symbol" character varying(10) NOT NULL, "decimals" smallint NOT NULL, "sender" character varying(42) NOT NULL, "receiver" character varying(42) NOT NULL, "amount" numeric(30,18) NOT NULL, "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_c4133312072d8f3064e441c82bb" PRIMARY KEY ("transactionHash"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d56506c7a145e8a2a778624f68" ON "transfers" ("contractAddress") `);
        await queryRunner.query(`CREATE INDEX "IDX_6c92af3d232eafe3d95378ddf8" ON "transfers" ("sender") `);
        await queryRunner.query(`CREATE INDEX "IDX_757baa99e14caaa0058936606c" ON "transfers" ("receiver") `);
        await queryRunner.query(`CREATE INDEX "IDX_d6446d8f923c6a64337de94a4f" ON "transfers" ("timestamp") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_d6446d8f923c6a64337de94a4f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_757baa99e14caaa0058936606c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6c92af3d232eafe3d95378ddf8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d56506c7a145e8a2a778624f68"`);
        await queryRunner.query(`DROP TABLE "transfers"`);
    }

}
