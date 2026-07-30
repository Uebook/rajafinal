import fs from 'fs';

let rawSchema = fs.readFileSync('drizzle/schema.ts', 'utf8');
rawSchema = 'import crypto from "crypto";\n' + rawSchema;

// Replace ID definition
rawSchema = rawSchema.replaceAll(
  'id: uuid("id").primaryKey().notNull(),',
  'id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),'
);

rawSchema = rawSchema.replaceAll(
  "'pending'::character varying",
  "'pending'"
);

const columnMappings = {
  'is_deleted:': 'isDeleted:',
  'password_hash:': 'passwordHash:',
  'created_at:': 'createdAt:',
  'updated_at:': 'updatedAt:',
  'full_name:': 'fullName:',
  'avatar_url:': 'avatarUrl:',
  'is_verified:': 'isVerified:',
  'geo_location:': 'geoLocation:',
  'token_hash:': 'tokenHash:',
  'user_id:': 'userId:',
  'expires_at:': 'expiresAt:',
  'is_revoked:': 'isRevoked:',
  'business_name:': 'businessName:',
  'gst_number:': 'gstNumber:',
  'pan_number:': 'panNumber:',
  'owner_name:': 'ownerName:',
  'business_type:': 'businessType:',
  'credit_limit:': 'creditLimit:',
  'otp_hash:': 'otpHash:',
  'is_used:': 'isUsed:',
  'actor_id:': 'actorId:',
  'entity_type:': 'entityType:',
  'entity_id:': 'entityId:',
  'diff_json:': 'diffJson:',
  'deleted_at:': 'deletedAt:',
  'product_id:': 'productId:',
  'cart_id:': 'cartId:',
  'order_id:': 'orderId:',
  'invoice_number:': 'invoiceNumber:',
  'buyer_gstin:': 'buyerGstin:',
  'seller_gstin:': 'sellerGstin:',
  'grand_total:': 'grandTotal:',
  'pdf_url:': 'pdfUrl:',
  'is_manual:': 'isManual:',
  'unit_price:': 'unitPrice:',
  'gst_rate:': 'gstRate:',
  'line_total:': 'lineTotal:',
  'gst_amount:': 'gstAmount:',
  'gateway_order_id:': 'gatewayOrderId:',
  'gateway_payment_id:': 'gatewayPaymentId:',
  'gateway_signature:': 'gatewaySignature:',
  'sort_order:': 'sortOrder:',
  'min_order_value:': 'minOrderValue:',
  'max_usage_count:': 'maxUsageCount:',
  'current_usage:': 'currentUsage:',
  'valid_from:': 'validFrom:',
  'valid_until:': 'validUntil:',
  'scope_type:': 'scopeType:',
  'scope_id:': 'scopeId:',
  'visible_to_vendor:': 'visibleToVendor:',
  'visible_to_retailer:': 'visibleToRetailer:',
  'parent_id:': 'parentId:',
  'sub_category_id:': 'subCategoryId:',
  'return_policy:': 'returnPolicy:',
  'return_window_days:': 'returnWindowDays:',
  'order_number:': 'orderNumber:',
  'discount_amount:': 'discountAmount:',
  'delivery_address:': 'deliveryAddress:',
  'discount_code_id:': 'discountCodeId:',
  'voice_order:': 'voiceOrder:',
  'voice_clip_url:': 'voiceClipUrl:',
  'eway_bill_no:': 'ewayBillNo:',
  'eway_bill_url:': 'ewayBillUrl:',
  'return_reason:': 'returnReason:',
  'return_image_url:': 'returnImageUrl:',
  'entry_type:': 'entryType:',
  'delivery_status:': 'deliveryStatus:',
  'is_read:': 'isRead:',
  'is_active:': 'isActive:',
  'low_stock_threshold:': 'lowStockThreshold:',
  'stock_qty:': 'stockQty:',
  'hsn_code:': 'hsnCode:',
  'category_id:': 'categoryId:',
  'base_price:': 'basePrice:',
  'image_url:': 'imageUrl:',
  'product_name:': 'productName:',
  'reference_type:': 'referenceType:',
  'reference_id:': 'referenceId:',
  'scheme_type:': 'schemeType:',
  'min_qty:': 'minQty:',
  'discount_pct:': 'discountPct:',
  'free_qty:': 'freeQty:',
  'discount_type:': 'discountType:',
};

// Sort replacements by length of the key descending to avoid substring conflicts
const sortedColumnMappings = Object.entries(columnMappings).sort((a, b) => b[0].length - a[0].length);

for (const [snake, camel] of sortedColumnMappings) {
  rawSchema = rawSchema.replaceAll(snake, camel);
}

const tableReferenceMappings = {
  'table.is_deleted': 'table.isDeleted',
  'table.created_at': 'table.createdAt',
  'table.user_id': 'table.userId',
  'table.parent_id': 'table.parentId',
  'table.product_id': 'table.productId',
  'table.cart_id': 'table.cartId',
  'table.order_id': 'table.orderId',
  'table.invoice_number': 'table.invoiceNumber',
  'table.actor_id': 'table.actorId',
  'table.entity_type': 'table.entityType',
  'table.entity_id': 'table.entityId',
  'table.discount_code_id': 'table.discountCodeId',
  'table.sub_category_id': 'table.subCategoryId',
  'table.sku': 'table.sku',
  'table.slug': 'table.slug',
  'table.status': 'table.status',
  'table.email': 'table.email',
  'table.mobile': 'table.mobile',
  'table.role': 'table.role',
  'table.depth': 'table.depth',
  'table.search_vector': 'table.search_vector',
  'table.order_number': 'table.orderNumber',
  'table.category_id': 'table.categoryId',
};

const sortedReferenceMappings = Object.entries(tableReferenceMappings).sort((a, b) => b[0].length - a[0].length);

for (const [snake, camel] of sortedReferenceMappings) {
  rawSchema = rawSchema.replaceAll(snake, camel);
}

const exportMappings = {
  'export const audit_log =': 'export const auditLog =',
  'export const refresh_tokens =': 'export const refreshTokens =',
  'export const cart_items =': 'export const cartItems =',
  'export const dealer_pricing =': 'export const dealerPricing =',
  'export const dealer_schemes =': 'export const dealerSchemes =',
  'export const order_items =': 'export const orderItems =',
  'export const product_images =': 'export const productImages =',
  'export const retailer_pricing =': 'export const retailerPricing =',
  'export const vendor_pricing =': 'export const vendorPricing =',
  'export const discount_codes =': 'export const discountCodes =',
  'export const device_tokens =': 'export const deviceTokens =',
  'export const ledger_entries =': 'export const ledgerEntries =',
};

for (const [snake, camel] of Object.entries(exportMappings)) {
  rawSchema = rawSchema.replaceAll(snake, camel);
}

// Fix foreign key reference renamed table
rawSchema = rawSchema.replaceAll('() => discount_codes.id', '() => discountCodes.id');

// Fix search_vector unknown type value
rawSchema = rawSchema.replaceAll('unknown("search_vector")', 'text("search_vector")');

// Fix timestamps mode: "string" -> change to default mode: "date"
rawSchema = rawSchema.replaceAll(", { withTimezone: true, mode: 'string' }", ", { withTimezone: true }");

fs.writeFileSync('src/db/schema.ts', rawSchema, 'utf8');
console.log('COMPREHENSIVELY FIXED schema.ts WITH CORRECT LENGTH-SORTED ORDER!');
