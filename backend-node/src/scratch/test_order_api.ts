import { db } from '../db/index.js';
import { orders } from '../db/schema.js';
import { OrderService } from '../services/order.service.js';
import { eq } from 'drizzle-orm';

async function test() {
  console.log("=== TESTING ORDER DATA & STATUS CONFIRMATION ===");
  const service = new OrderService();
  
  const orderList = await service.getOrdersList(undefined, 'SUPER_ADMIN', undefined, 1, 5);
  console.log(`Fetched ${orderList.length} orders.`);
  
  if (orderList.length > 0) {
    const first = orderList[0];
    console.log("Sample Order Fields:");
    console.log({
      id: first.id,
      order_number: first.order_number,
      status: first.status,
      subtotal: first.subtotal,
      gst_amount: first.gst_amount,
      discount_amount: first.discount_amount,
      grand_total: first.grand_total,
    });

    console.log("\nTesting updateOrderStatus to CONFIRMED...");
    const updated = await service.updateOrderStatus(first.id, 'CONFIRMED');
    console.log("✓ Order status updated successfully:", {
      id: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      grandTotal: updated.grandTotal,
    });

    console.log("\nTesting getOrderById...");
    const details = await service.getOrderById(first.id);
    console.log("✓ Order details fetched successfully:", {
      id: details.id,
      order_number: details.order_number,
      grand_total: details.grand_total,
      items_count: details.items.length,
    });
  } else {
    console.log("No orders found in database.");
  }
}

test().then(() => process.exit(0)).catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
