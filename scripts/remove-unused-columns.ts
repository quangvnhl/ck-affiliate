import 'dotenv/config';
import { db, postgresClient } from '../src/db/index';

async function removeUnusedColumns() {
  console.log('🗑️ Removing unused columns from transactions...');

  const columnsToRemove = ['points', 'cashback_amount', 'commission_received'];

  for (const col of columnsToRemove) {
    try {
      await db.execute(`ALTER TABLE "transactions" DROP COLUMN IF EXISTS "${col}"`);
      console.log(`✅ Dropped transactions.${col}`);
    } catch (e: any) {
      if (e.message?.includes('does not exist')) {
        console.log(`⏭️ transactions.${col} does not exist`);
      } else {
        console.log(`❌ transactions.${col}:`, e.message);
      }
    }
  }

  console.log('🎉 Done!');
  await postgresClient.end();
  process.exit(0);
}

removeUnusedColumns().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});