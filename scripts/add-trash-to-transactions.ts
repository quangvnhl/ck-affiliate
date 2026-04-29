import 'dotenv/config';
import { db, postgresClient } from '../src/db/index';

async function addTrashColumn() {
  console.log('➕ Adding trash column to transactions...');
  try {
    await db.execute(`ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "trash" BOOLEAN DEFAULT FALSE NOT NULL`);
    console.log('✅ Added trash column');
  } catch(e: any) {
    console.log('⏭️ Error or already exists:', e.message);
  }
  await postgresClient.end();
}

addTrashColumn();
