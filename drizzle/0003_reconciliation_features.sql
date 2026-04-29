-- Migration: Add reconciliation features
-- Date: 2026-04-28
-- Description: Add link status, new transactions fields, system_settings, reconciliation_logs, disputes tables

-- ============================================
-- 1. Add status and note to affiliate_links
-- ============================================
ALTER TABLE "affiliate_links" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT 'open' NOT NULL;
ALTER TABLE "affiliate_links" ADD COLUMN IF NOT EXISTS "note" TEXT;

CREATE INDEX IF NOT EXISTS "idx_links_status" ON "affiliate_links"("status");

-- ============================================
-- 2. Update transactions table - add new fields
-- ============================================
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "affiliate_link_id" UUID REFERENCES "affiliate_links"("id");
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "type" VARCHAR(20) DEFAULT 'commission' NOT NULL;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "checkout_id" VARCHAR(100);
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "commission_amount" DECIMAL(15, 2);
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "commission_percent" INTEGER DEFAULT 70;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "points" INTEGER;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "raw_data" JSONB;

-- Drop old column if exists
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "commission_received";

-- Update status values
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_status_check";
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_status_check" 
  CHECK ("status" IN ('pending', 'confirmed', 'rejected', 'paid'));

-- Index for user points query
CREATE INDEX IF NOT EXISTS "idx_trans_user_status" ON "transactions"("user_id", "status");

-- ============================================
-- 3. Create system_settings table
-- ============================================
CREATE TABLE IF NOT EXISTS "system_settings" (
  "id" SERIAL PRIMARY KEY,
  "key" VARCHAR(100) UNIQUE NOT NULL,
  "value" JSONB NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Insert default values
INSERT INTO "system_settings" ("key", "value", "description") VALUES
  ('points_exchange_rate', '1000', '1 point = 1000 VND'),
  ('minimum_withdrawal', '10', 'Minimum withdrawal: 10 points'),
  ('default_commission_percent', '70', 'Default commission: 70%')
ON CONFLICT ("key") DO NOTHING;

-- ============================================
-- 4. Create reconciliation_logs table
-- ============================================
CREATE TABLE IF NOT EXISTS "reconciliation_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "admin_id" UUID REFERENCES "users"("id"),
  "transaction_id" UUID REFERENCES "transactions"("id"),
  "action" VARCHAR(50) NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================
-- 5. Create disputes table
-- ============================================
CREATE TABLE IF NOT EXISTS "disputes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "transaction_id" UUID REFERENCES "transactions"("id"),
  "user_id" UUID REFERENCES "users"("id"),
  "reason" TEXT NOT NULL,
  "status" VARCHAR(20) DEFAULT 'pending' NOT NULL,
  "admin_note" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================
-- 6. Update withdrawal_requests status
-- ============================================
ALTER TABLE "withdrawal_requests" DROP CONSTRAINT IF EXISTS "withdrawal_requests_status_check";
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_status_check" 
  CHECK ("status" IN ('pending', 'approved', 'processing', 'paid', 'rejected'));

-- ============================================
-- 7. Add bank JSON to users (optional migration)
-- ============================================
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bank" JSONB;

-- Copy existing data to bank JSON (run manually if needed)
-- UPDATE "users" SET "bank" = jsonb_build_object(
--   'bank_name', "bank_name",
--   'bank_account_number', "bank_account_number",
--   'bank_account_holder', "bank_account_holder"
-- ) WHERE "bank_name" IS NOT NULL;