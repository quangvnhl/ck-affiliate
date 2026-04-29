import 'dotenv/config';
import { db, postgresClient } from '../src/db/index';

async function addCashback() {
  console.log('➕ Adding cashback_amount to transactions...');
  try {
    await db.execute(`ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "cashback_amount" DECIMAL(15, 2)`);
    console.log('✅ Added cashback_amount');
  } catch(e: any) {
    console.log('⏭️ Already exists:', e.message);
  }
  await postgresClient.end();
}

addCashback();