import 'dotenv/config';
import { db, postgresClient } from '../src/db/index';

async function verify() {
  console.log('🔍 Verifying columns...');

  // Check affiliate_links.status
  const linkStatus = await db.execute(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'affiliate_links' AND column_name = 'status'
  `);
  console.log('affiliate_links.status:', linkStatus.length > 0 ? '✅ exists' : '❌ missing');

  // Check transactions.type
  const transType = await db.execute(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'type'
  `);
  console.log('transactions.type:', transType.length > 0 ? '✅ exists' : '❌ missing');

  // Check transactions.points
  const transPoints = await db.execute(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'points'
  `);
  console.log('transactions.points:', transPoints.length > 0 ? '✅ exists' : '❌ missing');

  // List all transactions columns
  const allTrans = await db.execute(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'transactions' ORDER BY ordinal_position
  `);
  console.log('\n📋 All transactions columns:');
  allTrans.forEach((c: any) => console.log('  -', c.column_name));

  await postgresClient.end();
}

verify();