import crypto from "crypto";
import { pgTable, pgEnum, varchar, index, foreignKey, uuid, jsonb, text, timestamp, boolean, uniqueIndex, integer, unique } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"

export const discount_type_enum = pgEnum("discount_type_enum", ['FLAT', 'PERCENTAGE'])
export const ledger_type_enum = pgEnum("ledger_type_enum", ['DEBIT', 'CREDIT'])
export const order_status_enum = pgEnum("order_status_enum", ['PENDING', 'CONFIRMED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'])
export const payment_method_enum = pgEnum("payment_method_enum", ['ONLINE', 'CASH', 'CHEQUE', 'MANUAL'])
export const payment_status_enum = pgEnum("payment_status_enum", ['INITIATED', 'SUCCESS', 'FAILED', 'REFUNDED'])
export const product_status_enum = pgEnum("product_status_enum", ['ACTIVE', 'HIDDEN'])
export const scheme_type_enum = pgEnum("scheme_type_enum", ['VOLUME', 'BUY_X_GET_Y'])
export const user_role_enum = pgEnum("user_role_enum", ['SUPER_ADMIN', 'ADMIN', 'VENDOR', 'RETAILER'])
export const user_status_enum = pgEnum("user_status_enum", ['ACTIVE', 'BLOCKED', 'PENDING', 'CREDIT_BLOCKED', 'DEACTIVATED'])


export const alembic_version = pgTable("alembic_version", {
	version_num: varchar("version_num", { length: 32 }).primaryKey().notNull(),
});

export const auditLog = pgTable("audit_log", {
	actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" } ),
	role: varchar("role", { length: 20 }).notNull(),
	action: varchar("action", { length: 100 }).notNull(),
	entityType: varchar("entity_type", { length: 50 }).notNull(),
	entityId: uuid("entity_id"),
	diffJson: jsonb("diff_json"),
	description: text("description"),
	id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
},
(table) => {
	return {
		ix_audit_actorId: index("ix_audit_actor_id").on(table.actorId),
		ix_audit_createdAt: index("ix_audit_created_at").on(table.createdAt),
		ix_audit_entity: index("ix_audit_entity").on(table.entityId, table.entityType),
		ix_audit_log_isDeleted: index("ix_audit_log_is_deleted").on(table.isDeleted),
	}
});

export const carts = pgTable("carts", {
	userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
},
(table) => {
	return {
		ix_carts_isDeleted: index("ix_carts_is_deleted").on(table.isDeleted),
		ix_carts_userId: uniqueIndex("ix_carts_user_id").on(table.userId),
	}
});

export const deviceTokens = pgTable("device_tokens", {
	userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	token: text("token").notNull(),
	platform: varchar("platform", { length: 20 }).notNull(),
	id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
},
(table) => {
	return {
		ix_device_tokens_isDeleted: index("ix_device_tokens_is_deleted").on(table.isDeleted),
		ix_device_tokens_userId: index("ix_device_tokens_user_id").on(table.userId),
	}
});

export const ledgerEntries = pgTable("ledger_entries", {
	userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" } ),
	entryType: ledger_type_enum("entry_type").notNull(),
	amount: integer("amount").notNull(),
	referenceType: varchar("reference_type", { length: 50 }).notNull(),
	referenceId: uuid("reference_id").notNull(),
	description: text("description"),
	voucherType: varchar("voucher_type", { length: 50 }).default('GENERAL'),
	debitAccount: varchar("debit_account", { length: 100 }),
	creditAccount: varchar("credit_account", { length: 100 }),
	id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
},
(table) => {
	return {
		ix_ledger_createdAt: index("ix_ledger_created_at").on(table.createdAt),
		ix_ledger_entries_isDeleted: index("ix_ledger_entries_is_deleted").on(table.isDeleted),
		ix_ledger_userId: index("ix_ledger_user_id").on(table.userId),
	}
});

export const suppliers = pgTable("suppliers", {
	name: varchar("name", { length: 255 }).notNull(),
	contactPerson: varchar("contact_person", { length: 255 }),
	mobile: varchar("mobile", { length: 20 }),
	email: varchar("email", { length: 255 }),
	gstin: varchar("gstin", { length: 20 }),
	address: text("address"),
	balance: integer("balance").default(0).notNull(),
	id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => {
	return {
		ix_suppliers_isDeleted: index("ix_suppliers_is_deleted").on(table.isDeleted),
	}
});

export const purchases = pgTable("purchases", {
	purchaseNumber: varchar("purchase_number", { length: 50 }).notNull(),
	supplierId: uuid("supplier_id").notNull().references(() => suppliers.id, { onDelete: "restrict" }),
	invoiceDate: timestamp("invoice_date", { withTimezone: true }).defaultNow().notNull(),
	totalAmount: integer("total_amount").notNull(),
	paidAmount: integer("paid_amount").default(0).notNull(),
	paymentStatus: varchar("payment_status", { length: 20 }).default('UNPAID').notNull(),
	notes: text("notes"),
	id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => {
	return {
		ix_purchases_supplierId: index("ix_purchases_supplier_id").on(table.supplierId),
		ix_purchases_isDeleted: index("ix_purchases_is_deleted").on(table.isDeleted),
		ix_purchases_number: uniqueIndex("ix_purchases_number").on(table.purchaseNumber),
	}
});

export const purchaseItems = pgTable("purchase_items", {
	purchaseId: uuid("purchase_id").notNull().references(() => purchases.id, { onDelete: "cascade" }),
	productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
	quantity: integer("quantity").notNull(),
	purchaseRate: integer("purchase_rate").notNull(),
	totalAmount: integer("total_amount").notNull(),
	unit: varchar("unit", { length: 50 }),
	id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => {
	return {
		ix_purchase_items_purchaseId: index("ix_purchase_items_purchase_id").on(table.purchaseId),
		ix_purchase_items_productId: index("ix_purchase_items_product_id").on(table.productId),
		ix_purchase_items_isDeleted: index("ix_purchase_items_is_deleted").on(table.isDeleted),
	}
});

export const notifications = pgTable("notifications", {
	userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	title: varchar("title", { length: 255 }).notNull(),
	body: text("body").notNull(),
	notification_type: varchar("notification_type", { length: 50 }).notNull(),
	referenceId: uuid("reference_id"),
	isRead: boolean("is_read").default(false).notNull(),
	deliveryStatus: varchar("delivery_status", { length: 20 }).default('pending').notNull(),
	id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
},
(table) => {
	return {
		ix_notifications_isDeleted: index("ix_notifications_is_deleted").on(table.isDeleted),
		ix_notifications_userId: index("ix_notifications_user_id").on(table.userId),
	}
});

export const otps = pgTable("otps", {
	mobile: varchar("mobile", { length: 15 }).notNull(),
	otpHash: text("otp_hash").notNull(),
	purpose: varchar("purpose", { length: 30 }).notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	attempts: integer("attempts").default(0).notNull(),
	isUsed: boolean("is_used").default(false).notNull(),
	userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" } ),
	id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
},
(table) => {
	return {
		ix_otps_isDeleted: index("ix_otps_is_deleted").on(table.isDeleted),
		ix_otps_mobile: index("ix_otps_mobile").on(table.mobile),
	}
});

export const refreshTokens = pgTable("refresh_tokens", {
	userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	tokenHash: text("token_hash").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	isRevoked: boolean("is_revoked").default(false).notNull(),
	id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
},
(table) => {
	return {
		ix_refresh_tokens_isDeleted: index("ix_refresh_tokens_is_deleted").on(table.isDeleted),
		ix_refresh_tokens_userId: index("ix_refresh_tokens_user_id").on(table.userId),
	}
});

export const retailers = pgTable("retailers", {
	userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	businessName: varchar("business_name", { length: 255 }).notNull(),
	ownerName: varchar("owner_name", { length: 255 }).notNull(),
	businessType: varchar("business_type", { length: 100 }),
	gstNumber: varchar("gst_number", { length: 20 }),
	address: text("address"),
	city: varchar("city", { length: 100 }),
	state: varchar("state", { length: 100 }),
	pincode: varchar("pincode", { length: 10 }),
	creditLimit: integer("credit_limit").default(0).notNull(),
	id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
},
(table) => {
	return {
		ix_retailers_isDeleted: index("ix_retailers_is_deleted").on(table.isDeleted),
		retailers_user_id_key: unique("retailers_user_id_key").on(table.userId),
	}
});

export const vendors = pgTable("vendors", {
	userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	businessName: varchar("business_name", { length: 255 }).notNull(),
	gstNumber: varchar("gst_number", { length: 20 }),
	panNumber: varchar("pan_number", { length: 15 }),
	address: text("address"),
	city: varchar("city", { length: 100 }),
	state: varchar("state", { length: 100 }),
	pincode: varchar("pincode", { length: 10 }),
	id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
},
(table) => {
	return {
		ix_vendors_isDeleted: index("ix_vendors_is_deleted").on(table.isDeleted),
		vendors_user_id_key: unique("vendors_user_id_key").on(table.userId),
	}
});

export const cartItems = pgTable("cart_items", {
	cartId: uuid("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" } ),
	productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" } ),
	quantity: integer("quantity").notNull(),
	price_snapshot: integer("price_snapshot").notNull(),
	id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
},
(table) => {
	return {
		ix_cart_items_cart_product: uniqueIndex("ix_cart_items_cart_product").on(table.cartId, table.productId),
		ix_cart_items_isDeleted: index("ix_cart_items_is_deleted").on(table.isDeleted),
	}
});

export const dealerPricing = pgTable("dealer_pricing", {
	productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" } ),
	userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	price: integer("price").notNull(),
	id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
},
(table) => {
	return {
		ix_dealer_pricing_isDeleted: index("ix_dealer_pricing_is_deleted").on(table.isDeleted),
		ix_dealer_pricing_product_user: uniqueIndex("ix_dealer_pricing_product_user").on(table.productId, table.userId),
	}
});

export const dealerSchemes = pgTable("dealer_schemes", {
	userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" } ),
	schemeType: scheme_type_enum("scheme_type").notNull(),
	productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" } ),
	categoryId: uuid("category_id").references(() => categories.id, { onDelete: "cascade" } ),
	minQty: integer("min_qty").notNull(),
	discountPct: integer("discount_pct").notNull(),
	freeQty: integer("free_qty").notNull(),
	validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
	validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
	description: text("description"),
	id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
},
(table) => {
	return {
		ix_dealer_schemes_isDeleted: index("ix_dealer_schemes_is_deleted").on(table.isDeleted),
		ix_dealer_schemes_userId: index("ix_dealer_schemes_user_id").on(table.userId),
	}
});

export const invoices = pgTable("invoices", {
	orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "restrict" } ),
	invoiceNumber: varchar("invoice_number", { length: 30 }).notNull(),
	buyerGstin: varchar("buyer_gstin", { length: 20 }),
	sellerGstin: varchar("seller_gstin", { length: 20 }),
	subtotal: integer("subtotal").notNull(),
	cgst: integer("cgst").notNull(),
	sgst: integer("sgst").notNull(),
	igst: integer("igst").notNull(),
	grandTotal: integer("grand_total").notNull(),
	pdfUrl: text("pdf_url"),
	isManual: boolean("is_manual").default(false).notNull(),
	id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
},
(table) => {
	return {
		ix_invoices_isDeleted: index("ix_invoices_is_deleted").on(table.isDeleted),
		ix_invoices_number: uniqueIndex("ix_invoices_number").on(table.invoiceNumber),
		ix_invoices_orderId: index("ix_invoices_order_id").on(table.orderId),
		invoices_invoice_number_key: unique("invoices_invoice_number_key").on(table.invoiceNumber),
	}
});

export const orderItems = pgTable("order_items", {
	orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" } ),
	productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" } ),
	productName: varchar("product_name", { length: 255 }).notNull(),
	quantity: integer("quantity").notNull(),
	unitPrice: integer("unit_price").notNull(),
	gstRate: integer("gst_rate").notNull(),
	lineTotal: integer("line_total").notNull(),
	gstAmount: integer("gst_amount").notNull(),
	unit: varchar("unit", { length: 50 }),
	id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
},
(table) => {
	return {
		ix_order_items_isDeleted: index("ix_order_items_is_deleted").on(table.isDeleted),
		ix_order_items_orderId: index("ix_order_items_order_id").on(table.orderId),
	}
});

export const payments = pgTable("payments", {
	orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "restrict" } ),
	userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" } ),
	amount: integer("amount").notNull(),
	status: payment_status_enum("status").default('INITIATED').notNull(),
	method: payment_method_enum("method").notNull(),
	gatewayOrderId: varchar("gateway_order_id", { length: 100 }),
	gatewayPaymentId: varchar("gateway_payment_id", { length: 100 }),
	gatewaySignature: text("gateway_signature"),
	notes: text("notes"),
	id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
},
(table) => {
	return {
		ix_payments_isDeleted: index("ix_payments_is_deleted").on(table.isDeleted),
		ix_payments_orderId: index("ix_payments_order_id").on(table.orderId),
		ix_payments_userId: index("ix_payments_user_id").on(table.userId),
	}
});

export const productImages = pgTable("product_images", {
	productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" } ),
	imageUrl: text("image_url").notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
},
(table) => {
	return {
		ix_product_images_isDeleted: index("ix_product_images_is_deleted").on(table.isDeleted),
		ix_product_images_productId: index("ix_product_images_product_id").on(table.productId),
	}
});

export const retailerPricing = pgTable("retailer_pricing", {
	productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" } ),
	price: integer("price").notNull(),
	id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
},
(table) => {
	return {
		ix_retailer_pricing_isDeleted: index("ix_retailer_pricing_is_deleted").on(table.isDeleted),
		ix_retailer_pricing_product: uniqueIndex("ix_retailer_pricing_product").on(table.productId),
	}
});

export const vendorPricing = pgTable("vendor_pricing", {
	productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" } ),
	price: integer("price").notNull(),
	id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
},
(table) => {
	return {
		ix_vendor_pricing_isDeleted: index("ix_vendor_pricing_is_deleted").on(table.isDeleted),
		ix_vendor_pricing_product: uniqueIndex("ix_vendor_pricing_product").on(table.productId),
	}
});

export const discountCodes = pgTable("discount_codes", {
	code: varchar("code", { length: 50 }).notNull(),
	discountType: discount_type_enum("discount_type").notNull(),
	value: integer("value").notNull(),
	minOrderValue: integer("min_order_value").default(0).notNull(),
	maxUsageCount: integer("max_usage_count").default(0).notNull(),
	currentUsage: integer("current_usage").default(0).notNull(),
	validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
	validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
	scopeType: varchar("scope_type", { length: 20 }),
	scopeId: uuid("scope_id"),
	description: text("description"),
	id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
	isActive: boolean("is_active").default(true).notNull(),
},
(table) => {
	return {
		ix_discount_code: uniqueIndex("ix_discount_code").on(table.code),
		ix_discount_codes_isDeleted: index("ix_discount_codes_is_deleted").on(table.isDeleted),
	}
});

export const users = pgTable("users", {
	mobile: varchar("mobile", { length: 15 }).notNull(),
	email: varchar("email", { length: 255 }),
	passwordHash: text("password_hash"),
	fullName: varchar("full_name", { length: 255 }).notNull(),
	role: user_role_enum("role").notNull(),
	status: user_status_enum("status").default('ACTIVE').notNull(),
	isVerified: boolean("is_verified").default(false).notNull(),
	geoLocation: jsonb("geo_location"),
	id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
	avatarUrl: text("avatar_url"),
},
(table) => {
	return {
		ix_users_email: uniqueIndex("ix_users_email").on(table.email),
		ix_users_isDeleted: index("ix_users_is_deleted").on(table.isDeleted),
		ix_users_mobile: uniqueIndex("ix_users_mobile").on(table.mobile),
		ix_users_role: index("ix_users_role").on(table.role),
	}
});

export const categories = pgTable("categories", {
	name: varchar("name", { length: 255 }).notNull(),
	slug: varchar("slug", { length: 255 }).notNull(),
	description: text("description"),
	imageUrl: text("image_url"),
	parentId: uuid("parent_id"),
	visibleToVendor: boolean("visible_to_vendor").default(true).notNull(),
	visibleToRetailer: boolean("visible_to_retailer").default(true).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
	depth: integer("depth").default(0).notNull(),
},
(table) => {
	return {
		ix_categories_isDeleted: index("ix_categories_is_deleted").on(table.isDeleted),
		ix_categories_parentId: index("ix_categories_parent_id").on(table.parentId),
		ix_categories_depth: index("ix_categories_depth").on(table.depth),
		ix_categories_root_slug: uniqueIndex("ix_categories_root_slug").on(table.slug),
		ix_categories_slug_parentId: uniqueIndex("ix_categories_slug_parent_id").on(table.parentId, table.slug),
		categories_parent_id_fkey: foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "categories_parent_id_fkey"
		}).onDelete("set null"),
	}
});

export const products = pgTable("products", {
	name: varchar("name", { length: 255 }).notNull(),
	slug: varchar("slug", { length: 255 }).notNull(),
	sku: varchar("sku", { length: 50 }).notNull(),
	description: text("description"),
	unit: varchar("unit", { length: 50 }).notNull(),
	hsnCode: varchar("hsn_code", { length: 20 }),
	basePrice: integer("base_price").notNull(),
	gstRate: integer("gst_rate").default(18).notNull(),
	stockQty: integer("stock_qty").default(0).notNull(),
	lowStockThreshold: integer("low_stock_threshold").default(10).notNull(),
	status: product_status_enum("status").default('ACTIVE').notNull(),
	categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "restrict" } ),
	// TODO: failed to parse database type 'tsvector'
	search_vector: text("search_vector"),
	id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
	subCategoryId: uuid("sub_category_id").references(() => categories.id, { onDelete: "set null" } ),
	returnPolicy: varchar("return_policy", { length: 255 }),
	returnWindowDays: integer("return_window_days").default(7).notNull(),
},
(table) => {
	return {
		ix_products_categoryId: index("ix_products_category_id").on(table.categoryId),
		ix_products_isDeleted: index("ix_products_is_deleted").on(table.isDeleted),
		ix_products_search: index("ix_products_search").on(table.search_vector),
		ix_products_sku: uniqueIndex("ix_products_sku").on(table.sku),
		ix_products_subCategoryId: index("ix_products_sub_category_id").on(table.subCategoryId),
	}
});

export const orders = pgTable("orders", {
	userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" } ),
	orderNumber: varchar("order_number", { length: 30 }).notNull(),
	status: order_status_enum("status").default('PENDING').notNull(),
	subtotal: integer("subtotal").notNull(),
	gstAmount: integer("gst_amount").notNull(),
	discountAmount: integer("discount_amount").notNull(),
	grandTotal: integer("grand_total").notNull(),
	deliveryAddress: text("delivery_address"),
	discountCodeId: uuid("discount_code_id").references(() => discountCodes.id, { onDelete: "set null" } ),
	voiceOrder: boolean("voice_order").default(false).notNull(),
	voiceClipUrl: text("voice_clip_url"),
	ewayBillNo: varchar("eway_bill_no", { length: 50 }),
	ewayBillUrl: text("eway_bill_url"),
	id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
	returnReason: text("return_reason"),
	returnImageUrl: varchar("return_image_url"),
},
(table) => {
	return {
		ix_orders_isDeleted: index("ix_orders_is_deleted").on(table.isDeleted),
		ix_orders_orderNumber: uniqueIndex("ix_orders_order_number").on(table.orderNumber),
		ix_orders_status: index("ix_orders_status").on(table.status),
		ix_orders_userId: index("ix_orders_user_id").on(table.userId),
		orders_order_number_key: unique("orders_order_number_key").on(table.orderNumber),
	}
});