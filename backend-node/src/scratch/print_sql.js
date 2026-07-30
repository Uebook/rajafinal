import 'dotenv/config';
import { db } from '../db/index.js';
import { orders } from '../db/schema.js';
import crypto from 'crypto';

function test() {
  const orderId = crypto.randomUUID();
  const query = db.insert(orders).values({
    id: orderId,
    userId: crypto.randomUUID(),
    orderNumber: 'TEST-123',
    status: 'PENDING',
    subtotal: 100,
    gstAmount: 18,
    discountAmount: 0,
    grandTotal: 118,
    deliveryAddress: 'Test Address',
    voiceOrder: false,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log("Compiled SQL Query:");
  console.log(query.toSQL());
  process.exit(0);
}

test();
