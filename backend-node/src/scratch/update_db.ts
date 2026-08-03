import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Altering database table: order_items...');
  await db.execute(sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit VARCHAR(50);`);
  console.log('Database altered successfully!');
  process.exit(0);
}

main().catch(err => {
  console.error('Failed to alter database:', err);
  process.exit(1);
});
