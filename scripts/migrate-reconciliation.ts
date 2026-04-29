import 'dotenv/config';
import { db, postgresClient } from '../src/db/index';

async function migrate() {
  console.log('🔄 Starting migration...');

  // 1. Add status and note to affiliate_links
  await db.execute(`ALTER TABLE "affiliate_links" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT 'open' NOT NULL`);
  await db.execute(`ALTER TABLE "affiliate_links" ADD COLUMN IF NOT EXISTS "note" TEXT`);
  await db.execute(`CREATE INDEX IF NOT EXISTS "idx_links_status" ON "affiliate_links"("status")`);
  console.log('✅ affiliate_links updated');

  // 2. Update transactions table
  await db.execute(`ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "affiliate_link_id" UUID REFERENCES "affiliate_links"("id")`);
  await db.execute(`ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "type" VARCHAR(20) DEFAULT 'commission' NOT NULL`);
  await db.execute(`ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "checkout_id" VARCHAR(100)`);
  await db.execute(`ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "commission_amount" DECIMAL(15, 2)`);
  await db.execute(`ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "commission_percent" INTEGER DEFAULT 70`);
  await db.execute(`ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "points" INTEGER`);
  await db.execute(`ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "raw_data" JSONB`);
  console.log('✅ transactions updated');

  // 3. Create system_settings table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS "system_settings" (
      "id" SERIAL PRIMARY KEY,
      "key" VARCHAR(100) UNIQUE NOT NULL,
      "value" JSONB NOT NULL,
      "description" TEXT,
      "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
      "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  console.log('✅ system_settings created');

  // Insert default settings
  await db.execute(`INSERT INTO "system_settings" ("key", "value", "description") VALUES ('points_exchange_rate', '1000', '1 point = 1000 VND') ON CONFLICT ("key") DO NOTHING`);
  await db.execute(`INSERT INTO "system_settings" ("key", "value", "description") VALUES ('minimum_withdrawal', '10', 'Minimum withdrawal: 10 points') ON CONFLICT ("key") DO NOTHING`);
  await db.execute(`INSERT INTO "system_settings" ("key", "value", "description") VALUES ('default_commission_percent', '70', 'Default commission: 70%') ON CONFLICT ("key") DO NOTHING`);
  console.log('✅ default settings inserted');

  // 4. Create reconciliation_logs table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS "reconciliation_logs" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "admin_id" UUID REFERENCES "users"("id"),
      "transaction_id" UUID REFERENCES "transactions"("id"),
      "action" VARCHAR(50) NOT NULL,
      "note" TEXT,
      "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  console.log('✅ reconciliation_logs created');

  // 5. Create disputes table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS "disputes" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "transaction_id" UUID REFERENCES "transactions"("id"),
      "user_id" UUID REFERENCES "users"("id"),
      "reason" TEXT NOT NULL,
      "status" VARCHAR(20) DEFAULT 'pending' NOT NULL,
      "admin_note" TEXT,
      "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
      "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  console.log('✅ disputes created');

  // 6. Add index for user points query
  await db.execute(`CREATE INDEX IF NOT EXISTS "idx_trans_user_status" ON "transactions"("user_id", "status")`);
  console.log('✅ indexes created');

  // 7. Add bank JSON to users
  await db.execute(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bank" JSONB`);
  console.log('✅ users updated');

  console.log('🎉 Migration complete!');

  await postgresClient.end();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});