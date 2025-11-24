import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1700840000000 implements MigrationInterface {
  name = 'InitSchema1700840000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "balance" NUMERIC(15,2) NOT NULL DEFAULT 0
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_history" (
        "id" SERIAL PRIMARY KEY,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "user_id" INT REFERENCES "users"("id") ON DELETE CASCADE,
        "action" VARCHAR(32) NOT NULL,
        "amount" NUMERIC(15,2) NOT NULL,
        "ts" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      INSERT INTO "users" (id, balance)
      VALUES (1, 0)
      ON CONFLICT (id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
