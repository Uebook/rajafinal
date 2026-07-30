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

export const audit_log = pgTable("audit_log", {
	actor_id: uuid("actor_id").references(() => users.id, { onDelete: "set null" } ),
	role: varchar("role", { length: 20 }).notNull(),
	action: varchar("action", { length: 100 }).notNull(),
	entity_type: varchar("entity_type", { length: 50 }).notNull(),
	entity_id: uuid("entity_id"),
	diff_json: jsonb("diff_json"),
	description: text("description"),
	id: uuid("id").primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	is_deleted: boolean("is_deleted").default(false).notNull(),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		ix_audit_actor_id: index("ix_audit_actor_id").on(table.actor_id),
		ix_audit_created_at: index("ix_audit_created_at").on(table.created_at),
		ix_audit_entity: index("ix_audit_entity").on(table.entity_id, table.entity_type),
		ix_audit_log_is_deleted: index("ix_audit_log_is_deleted").on(table.is_deleted),
	}
});

export const carts = pgTable("carts", {
	user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	id: uuid("id").primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	is_deleted: boolean("is_deleted").default(false).notNull(),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		ix_carts_is_deleted: index("ix_carts_is_deleted").on(table.is_deleted),
		ix_carts_user_id: uniqueIndex("ix_carts_user_id").on(table.user_id),
	}
});

export const device_tokens = pgTable("device_tokens", {
	user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	token: text("token").notNull(),
	platform: varchar("platform", { length: 20 }).notNull(),
	id: uuid("id").primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	is_deleted: boolean("is_deleted").default(false).notNull(),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		ix_device_tokens_is_deleted: index("ix_device_tokens_is_deleted").on(table.is_deleted),
		ix_device_tokens_user_id: index("ix_device_tokens_user_id").on(table.user_id),
	}
});

export const ledger_entries = pgTable("ledger_entries", {
	user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" } ),
	entry_type: ledger_type_enum("entry_type").notNull(),
	amount: integer("amount").notNull(),
	reference_type: varchar("reference_type", { length: 50 }).notNull(),
	reference_id: uuid("reference_id").notNull(),
	description: text("description"),
	id: uuid("id").primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	is_deleted: boolean("is_deleted").default(false).notNull(),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		ix_ledger_created_at: index("ix_ledger_created_at").on(table.created_at),
		ix_ledger_entries_is_deleted: index("ix_ledger_entries_is_deleted").on(table.is_deleted),
		ix_ledger_user_id: index("ix_ledger_user_id").on(table.user_id),
	}
});

export const notifications = pgTable("notifications", {
	user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	title: varchar("title", { length: 255 }).notNull(),
	body: text("body").notNull(),
	notification_type: varchar("notification_type", { length: 50 }).notNull(),
	reference_id: uuid("reference_id"),
	is_read: boolean("is_read").default(false).notNull(),
	delivery_status: varchar("delivery_status", { length: 20 }).default('pending'::character varying).notNull(),
	id: uuid("id").primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	is_deleted: boolean("is_deleted").default(false).notNull(),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		ix_notifications_is_deleted: index("ix_notifications_is_deleted").on(table.is_deleted),
		ix_notifications_user_id: index("ix_notifications_user_id").on(table.user_id),
	}
});

export const otps = pgTable("otps", {
	mobile: varchar("mobile", { length: 15 }).notNull(),
	otp_hash: text("otp_hash").notNull(),
	purpose: varchar("purpose", { length: 30 }).notNull(),
	expires_at: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	attempts: integer("attempts").default(0).notNull(),
	is_used: boolean("is_used").default(false).notNull(),
	user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" } ),
	id: uuid("id").primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	is_deleted: boolean("is_deleted").default(false).notNull(),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		ix_otps_is_deleted: index("ix_otps_is_deleted").on(table.is_deleted),
		ix_otps_mobile: index("ix_otps_mobile").on(table.mobile),
	}
});

export const refresh_tokens = pgTable("refresh_tokens", {
	user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	token_hash: text("token_hash").notNull(),
	expires_at: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	is_revoked: boolean("is_revoked").default(false).notNull(),
	id: uuid("id").primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	is_deleted: boolean("is_deleted").default(false).notNull(),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		ix_refresh_tokens_is_deleted: index("ix_refresh_tokens_is_deleted").on(table.is_deleted),
		ix_refresh_tokens_user_id: index("ix_refresh_tokens_user_id").on(table.user_id),
	}
});

export const retailers = pgTable("retailers", {
	user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	business_name: varchar("business_name", { length: 255 }).notNull(),
	owner_name: varchar("owner_name", { length: 255 }).notNull(),
	business_type: varchar("business_type", { length: 100 }),
	gst_number: varchar("gst_number", { length: 20 }),
	address: text("address"),
	city: varchar("city", { length: 100 }),
	state: varchar("state", { length: 100 }),
	pincode: varchar("pincode", { length: 10 }),
	credit_limit: integer("credit_limit").default(0).notNull(),
	id: uuid("id").primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	is_deleted: boolean("is_deleted").default(false).notNull(),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		ix_retailers_is_deleted: index("ix_retailers_is_deleted").on(table.is_deleted),
		retailers_user_id_key: unique("retailers_user_id_key").on(table.user_id),
	}
});

export const vendors = pgTable("vendors", {
	user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	business_name: varchar("business_name", { length: 255 }).notNull(),
	gst_number: varchar("gst_number", { length: 20 }),
	pan_number: varchar("pan_number", { length: 15 }),
	address: text("address"),
	city: varchar("city", { length: 100 }),
	state: varchar("state", { length: 100 }),
	pincode: varchar("pincode", { length: 10 }),
	id: uuid("id").primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	is_deleted: boolean("is_deleted").default(false).notNull(),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		ix_vendors_is_deleted: index("ix_vendors_is_deleted").on(table.is_deleted),
		vendors_user_id_key: unique("vendors_user_id_key").on(table.user_id),
	}
});

export const cart_items = pgTable("cart_items", {
	cart_id: uuid("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" } ),
	product_id: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" } ),
	quantity: integer("quantity").notNull(),
	price_snapshot: integer("price_snapshot").notNull(),
	id: uuid("id").primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	is_deleted: boolean("is_deleted").default(false).notNull(),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		ix_cart_items_cart_product: uniqueIndex("ix_cart_items_cart_product").on(table.cart_id, table.product_id),
		ix_cart_items_is_deleted: index("ix_cart_items_is_deleted").on(table.is_deleted),
	}
});

export const dealer_pricing = pgTable("dealer_pricing", {
	product_id: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" } ),
	user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	price: integer("price").notNull(),
	id: uuid("id").primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	is_deleted: boolean("is_deleted").default(false).notNull(),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		ix_dealer_pricing_is_deleted: index("ix_dealer_pricing_is_deleted").on(table.is_deleted),
		ix_dealer_pricing_product_user: uniqueIndex("ix_dealer_pricing_product_user").on(table.product_id, table.user_id),
	}
});

export const dealer_schemes = pgTable("dealer_schemes", {
	user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" } ),
	scheme_type: scheme_type_enum("scheme_type").notNull(),
	product_id: uuid("product_id").references(() => products.id, { onDelete: "cascade" } ),
	category_id: uuid("category_id").references(() => categories.id, { onDelete: "cascade" } ),
	min_qty: integer("min_qty").notNull(),
	discount_pct: integer("discount_pct").notNull(),
	free_qty: integer("free_qty").notNull(),
	valid_from: timestamp("valid_from", { withTimezone: true, mode: 'string' }).notNull(),
	valid_until: timestamp("valid_until", { withTimezone: true, mode: 'string' }).notNull(),
	description: text("description"),
	id: uuid("id").primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	is_deleted: boolean("is_deleted").default(false).notNull(),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		ix_dealer_schemes_is_deleted: index("ix_dealer_schemes_is_deleted").on(table.is_deleted),
		ix_dealer_schemes_user_id: index("ix_dealer_schemes_user_id").on(table.user_id),
	}
});

export const invoices = pgTable("invoices", {
	order_id: uuid("order_id").notNull().references(() => orders.id, { onDelete: "restrict" } ),
	invoice_number: varchar("invoice_number", { length: 30 }).notNull(),
	buyer_gstin: varchar("buyer_gstin", { length: 20 }),
	seller_gstin: varchar("seller_gstin", { length: 20 }),
	subtotal: integer("subtotal").notNull(),
	cgst: integer("cgst").notNull(),
	sgst: integer("sgst").notNull(),
	igst: integer("igst").notNull(),
	grand_total: integer("grand_total").notNull(),
	pdf_url: text("pdf_url"),
	is_manual: boolean("is_manual").default(false).notNull(),
	id: uuid("id").primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	is_deleted: boolean("is_deleted").default(false).notNull(),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		ix_invoices_is_deleted: index("ix_invoices_is_deleted").on(table.is_deleted),
		ix_invoices_number: uniqueIndex("ix_invoices_number").on(table.invoice_number),
		ix_invoices_order_id: index("ix_invoices_order_id").on(table.order_id),
		invoices_invoice_number_key: unique("invoices_invoice_number_key").on(table.invoice_number),
	}
});

export const order_items = pgTable("order_items", {
	order_id: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" } ),
	product_id: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" } ),
	product_name: varchar("product_name", { length: 255 }).notNull(),
	quantity: integer("quantity").notNull(),
	unit_price: integer("unit_price").notNull(),
	gst_rate: integer("gst_rate").notNull(),
	line_total: integer("line_total").notNull(),
	gst_amount: integer("gst_amount").notNull(),
	id: uuid("id").primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	is_deleted: boolean("is_deleted").default(false).notNull(),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		ix_order_items_is_deleted: index("ix_order_items_is_deleted").on(table.is_deleted),
		ix_order_items_order_id: index("ix_order_items_order_id").on(table.order_id),
	}
});

export const payments = pgTable("payments", {
	order_id: uuid("order_id").notNull().references(() => orders.id, { onDelete: "restrict" } ),
	user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" } ),
	amount: integer("amount").notNull(),
	status: payment_status_enum("status").default('INITIATED').notNull(),
	method: payment_method_enum("method").notNull(),
	gateway_order_id: varchar("gateway_order_id", { length: 100 }),
	gateway_payment_id: varchar("gateway_payment_id", { length: 100 }),
	gateway_signature: text("gateway_signature"),
	notes: text("notes"),
	id: uuid("id").primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	is_deleted: boolean("is_deleted").default(false).notNull(),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		ix_payments_is_deleted: index("ix_payments_is_deleted").on(table.is_deleted),
		ix_payments_order_id: index("ix_payments_order_id").on(table.order_id),
		ix_payments_user_id: index("ix_payments_user_id").on(table.user_id),
	}
});

export const product_images = pgTable("product_images", {
	product_id: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" } ),
	image_url: text("image_url").notNull(),
	sort_order: integer("sort_order").default(0).notNull(),
	id: uuid("id").primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	is_deleted: boolean("is_deleted").default(false).notNull(),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		ix_product_images_is_deleted: index("ix_product_images_is_deleted").on(table.is_deleted),
		ix_product_images_product_id: index("ix_product_images_product_id").on(table.product_id),
	}
});

export const retailer_pricing = pgTable("retailer_pricing", {
	product_id: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" } ),
	price: integer("price").notNull(),
	id: uuid("id").primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	is_deleted: boolean("is_deleted").default(false).notNull(),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		ix_retailer_pricing_is_deleted: index("ix_retailer_pricing_is_deleted").on(table.is_deleted),
		ix_retailer_pricing_product: uniqueIndex("ix_retailer_pricing_product").on(table.product_id),
	}
});

export const vendor_pricing = pgTable("vendor_pricing", {
	product_id: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" } ),
	price: integer("price").notNull(),
	id: uuid("id").primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	is_deleted: boolean("is_deleted").default(false).notNull(),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		ix_vendor_pricing_is_deleted: index("ix_vendor_pricing_is_deleted").on(table.is_deleted),
		ix_vendor_pricing_product: uniqueIndex("ix_vendor_pricing_product").on(table.product_id),
	}
});

export const discount_codes = pgTable("discount_codes", {
	code: varchar("code", { length: 50 }).notNull(),
	discount_type: discount_type_enum("discount_type").notNull(),
	value: integer("value").notNull(),
	min_order_value: integer("min_order_value").default(0).notNull(),
	max_usage_count: integer("max_usage_count").default(0).notNull(),
	current_usage: integer("current_usage").default(0).notNull(),
	valid_from: timestamp("valid_from", { withTimezone: true, mode: 'string' }).notNull(),
	valid_until: timestamp("valid_until", { withTimezone: true, mode: 'string' }).notNull(),
	scope_type: varchar("scope_type", { length: 20 }),
	scope_id: uuid("scope_id"),
	description: text("description"),
	id: uuid("id").primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	is_deleted: boolean("is_deleted").default(false).notNull(),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	is_active: boolean("is_active").default(true).notNull(),
},
(table) => {
	return {
		ix_discount_code: uniqueIndex("ix_discount_code").on(table.code),
		ix_discount_codes_is_deleted: index("ix_discount_codes_is_deleted").on(table.is_deleted),
	}
});

export const users = pgTable("users", {
	mobile: varchar("mobile", { length: 15 }).notNull(),
	email: varchar("email", { length: 255 }),
	password_hash: text("password_hash"),
	full_name: varchar("full_name", { length: 255 }).notNull(),
	role: user_role_enum("role").notNull(),
	status: user_status_enum("status").default('ACTIVE').notNull(),
	is_verified: boolean("is_verified").default(false).notNull(),
	geo_location: jsonb("geo_location"),
	id: uuid("id").primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	is_deleted: boolean("is_deleted").default(false).notNull(),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	avatar_url: text("avatar_url"),
},
(table) => {
	return {
		ix_users_email: uniqueIndex("ix_users_email").on(table.email),
		ix_users_is_deleted: index("ix_users_is_deleted").on(table.is_deleted),
		ix_users_mobile: uniqueIndex("ix_users_mobile").on(table.mobile),
		ix_users_role: index("ix_users_role").on(table.role),
	}
});

export const categories = pgTable("categories", {
	name: varchar("name", { length: 255 }).notNull(),
	slug: varchar("slug", { length: 255 }).notNull(),
	description: text("description"),
	image_url: text("image_url"),
	parent_id: uuid("parent_id"),
	visible_to_vendor: boolean("visible_to_vendor").default(true).notNull(),
	visible_to_retailer: boolean("visible_to_retailer").default(true).notNull(),
	is_active: boolean("is_active").default(true).notNull(),
	id: uuid("id").primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	is_deleted: boolean("is_deleted").default(false).notNull(),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	depth: integer("depth").default(0).notNull(),
},
(table) => {
	return {
		ix_categories_is_deleted: index("ix_categories_is_deleted").on(table.is_deleted),
		ix_categories_parent_id: index("ix_categories_parent_id").on(table.parent_id),
		ix_categories_depth: index("ix_categories_depth").on(table.depth),
		ix_categories_root_slug: uniqueIndex("ix_categories_root_slug").on(table.slug),
		ix_categories_slug_parent_id: uniqueIndex("ix_categories_slug_parent_id").on(table.parent_id, table.slug),
		categories_parent_id_fkey: foreignKey({
			columns: [table.parent_id],
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
	hsn_code: varchar("hsn_code", { length: 20 }),
	base_price: integer("base_price").notNull(),
	gst_rate: integer("gst_rate").default(18).notNull(),
	stock_qty: integer("stock_qty").default(0).notNull(),
	low_stock_threshold: integer("low_stock_threshold").default(10).notNull(),
	status: product_status_enum("status").default('ACTIVE').notNull(),
	category_id: uuid("category_id").notNull().references(() => categories.id, { onDelete: "restrict" } ),
	// TODO: failed to parse database type 'tsvector'
	search_vector: unknown("search_vector"),
	id: uuid("id").primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	is_deleted: boolean("is_deleted").default(false).notNull(),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	sub_category_id: uuid("sub_category_id").references(() => categories.id, { onDelete: "set null" } ),
	return_policy: varchar("return_policy", { length: 255 }),
	return_window_days: integer("return_window_days").default(7).notNull(),
},
(table) => {
	return {
		ix_products_category_id: index("ix_products_category_id").on(table.category_id),
		ix_products_is_deleted: index("ix_products_is_deleted").on(table.is_deleted),
		ix_products_search: index("ix_products_search").on(table.search_vector),
		ix_products_sku: uniqueIndex("ix_products_sku").on(table.sku),
		ix_products_sub_category_id: index("ix_products_sub_category_id").on(table.sub_category_id),
	}
});

export const orders = pgTable("orders", {
	user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" } ),
	order_number: varchar("order_number", { length: 30 }).notNull(),
	status: order_status_enum("status").default('PENDING').notNull(),
	subtotal: integer("subtotal").notNull(),
	gst_amount: integer("gst_amount").notNull(),
	discount_amount: integer("discount_amount").notNull(),
	grand_total: integer("grand_total").notNull(),
	delivery_address: text("delivery_address"),
	discount_code_id: uuid("discount_code_id").references(() => discount_codes.id, { onDelete: "set null" } ),
	voice_order: boolean("voice_order").default(false).notNull(),
	voice_clip_url: text("voice_clip_url"),
	eway_bill_no: varchar("eway_bill_no", { length: 50 }),
	eway_bill_url: text("eway_bill_url"),
	id: uuid("id").primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	is_deleted: boolean("is_deleted").default(false).notNull(),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	return_reason: text("return_reason"),
	return_image_url: varchar("return_image_url"),
},
(table) => {
	return {
		ix_orders_is_deleted: index("ix_orders_is_deleted").on(table.is_deleted),
		ix_orders_order_number: uniqueIndex("ix_orders_order_number").on(table.order_number),
		ix_orders_status: index("ix_orders_status").on(table.status),
		ix_orders_user_id: index("ix_orders_user_id").on(table.user_id),
		orders_order_number_key: unique("orders_order_number_key").on(table.order_number),
	}
});