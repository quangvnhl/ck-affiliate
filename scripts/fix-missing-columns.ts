import 'dotenv/config';
import { db, postgresClient } from '../src/db/index';

async function fixMissingColumns() {
  console.log('🔄 Fixing missing columns...');

  // 1. Add status and note to affiliate_links
  console.log('📦 Adding status, note to affiliate_links...');
  try {
    await db.execute(`ALTER TABLE "affiliate_links" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT 'open' NOT NULL`);
    console.log('✅ affiliate_links.status');
  } catch (e: any) {
    if (e.message?.includes('already exists')) {
      console.log('⏭️ affiliate_links.status already exists');
    } else {
      console.error('❌ affiliate_links.status:', e.message);
    }
  }

  try {
    await db.execute(`ALTER TABLE "affiliate_links" ADD COLUMN IF NOT EXISTS "note" TEXT`);
    console.log('✅ affiliate_links.note');
  } catch (e: any) {
    if (e.message?.includes('already exists')) {
      console.log('⏭️ affiliate_links.note already exists');
    } else {
      console.error('❌ affiliate_links.note:', e.message);
    }
  }

  // 2. Add columns to transactions
  console.log('📦 Adding columns to transactions...');
  
  const transColumns = [
    { col: 'type', type: 'VARCHAR(20) DEFAULT commission NOT NULL' },
    { col: 'affiliate_link_id', type: 'UUID' },
    { col: 'checkout_id', type: 'VARCHAR(100)' },
    { col: 'commission_amount', type: 'DECIMAL(15, 2)' },
    { col: 'commission_percent', type: 'INTEGER DEFAULT 70' },
    { col: 'points', type: 'INTEGER' },
    { col: 'raw_data', type: 'JSONB' },
  ];

  for (const { col, type } of transColumns) {
    try {
      await db.execute(`ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "${col}" ${type}`);
      console.log(`✅ transactions.${col}`);
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        console.log(`⏭️ transactions.${col} already exists`);
      } else {
        console.error(`❌ transactions.${col}:`, e.message);
      }
    }
  }

  // 3. Add index for status filter
  try {
    await db.execute(`CREATE INDEX IF NOT EXISTS "idx_links_status" ON "affiliate_links"("status")`);
    console.log('✅ idx_links_status');
  } catch (e: any) {
    console.log('⏭️ idx_links_status already exists');
  }

  // 4. Add index for user points query
  try {
    await db.execute(`CREATE INDEX IF NOT EXISTS "idx_trans_user_status" ON "transactions"("user_id", "status")`);
    console.log('✅ idx_trans_user_status');
  } catch (e: any) {
    console.log('⏭️ idx_trans_user_status already exists');
  }

  console.log('🎉 Fix complete!');
  
  await postgresClient.end();
  process.exit(0);
}

fixMissingColumns().catch((err) => {
  console.error('❌ Fix failed:', err);
  process.exit(1);
});