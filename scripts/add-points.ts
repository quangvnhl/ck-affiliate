import 'dotenv/config';
import { db, postgresClient } from '../src/db/index';

async function addPointsColumn() {
  console.log('➕ Adding points column to transactions...');
  try {
    await db.execute(`ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "points" INTEGER`);
    console.log('✅ Added points column');
  } catch(e: any) {
    console.log('⏭️ Already exists or error:', e.message);
  }
  await postgresClient.end();
}

addPointsColumn();