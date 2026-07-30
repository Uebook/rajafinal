import { relations } from "drizzle-orm/relations";
import { users, audit_log, carts, device_tokens, ledger_entries, notifications, otps, refresh_tokens, retailers, vendors, cart_items, products, dealer_pricing, categories, dealer_schemes, orders, invoices, order_items, payments, product_images, retailer_pricing, vendor_pricing, discount_codes } from "./schema";

export const audit_logRelations = relations(audit_log, ({one}) => ({
	user: one(users, {
		fields: [audit_log.actor_id],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	audit_logs: many(audit_log),
	carts: many(carts),
	device_tokens: many(device_tokens),
	ledger_entries: many(ledger_entries),
	notifications: many(notifications),
	otps: many(otps),
	refresh_tokens: many(refresh_tokens),
	retailers: many(retailers),
	vendors: many(vendors),
	dealer_pricings: many(dealer_pricing),
	dealer_schemes: many(dealer_schemes),
	payments: many(payments),
	orders: many(orders),
}));

export const cartsRelations = relations(carts, ({one, many}) => ({
	user: one(users, {
		fields: [carts.user_id],
		references: [users.id]
	}),
	cart_items: many(cart_items),
}));

export const device_tokensRelations = relations(device_tokens, ({one}) => ({
	user: one(users, {
		fields: [device_tokens.user_id],
		references: [users.id]
	}),
}));

export const ledger_entriesRelations = relations(ledger_entries, ({one}) => ({
	user: one(users, {
		fields: [ledger_entries.user_id],
		references: [users.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user: one(users, {
		fields: [notifications.user_id],
		references: [users.id]
	}),
}));

export const otpsRelations = relations(otps, ({one}) => ({
	user: one(users, {
		fields: [otps.user_id],
		references: [users.id]
	}),
}));

export const refresh_tokensRelations = relations(refresh_tokens, ({one}) => ({
	user: one(users, {
		fields: [refresh_tokens.user_id],
		references: [users.id]
	}),
}));

export const retailersRelations = relations(retailers, ({one}) => ({
	user: one(users, {
		fields: [retailers.user_id],
		references: [users.id]
	}),
}));

export const vendorsRelations = relations(vendors, ({one}) => ({
	user: one(users, {
		fields: [vendors.user_id],
		references: [users.id]
	}),
}));

export const cart_itemsRelations = relations(cart_items, ({one}) => ({
	cart: one(carts, {
		fields: [cart_items.cart_id],
		references: [carts.id]
	}),
	product: one(products, {
		fields: [cart_items.product_id],
		references: [products.id]
	}),
}));

export const productsRelations = relations(products, ({one, many}) => ({
	cart_items: many(cart_items),
	dealer_pricings: many(dealer_pricing),
	dealer_schemes: many(dealer_schemes),
	order_items: many(order_items),
	product_images: many(product_images),
	retailer_pricings: many(retailer_pricing),
	vendor_pricings: many(vendor_pricing),
	category_category_id: one(categories, {
		fields: [products.category_id],
		references: [categories.id],
		relationName: "products_category_id_categories_id"
	}),
	category_sub_category_id: one(categories, {
		fields: [products.sub_category_id],
		references: [categories.id],
		relationName: "products_sub_category_id_categories_id"
	}),
}));

export const dealer_pricingRelations = relations(dealer_pricing, ({one}) => ({
	product: one(products, {
		fields: [dealer_pricing.product_id],
		references: [products.id]
	}),
	user: one(users, {
		fields: [dealer_pricing.user_id],
		references: [users.id]
	}),
}));

export const dealer_schemesRelations = relations(dealer_schemes, ({one}) => ({
	category: one(categories, {
		fields: [dealer_schemes.category_id],
		references: [categories.id]
	}),
	product: one(products, {
		fields: [dealer_schemes.product_id],
		references: [products.id]
	}),
	user: one(users, {
		fields: [dealer_schemes.user_id],
		references: [users.id]
	}),
}));

export const categoriesRelations = relations(categories, ({one, many}) => ({
	dealer_schemes: many(dealer_schemes),
	category: one(categories, {
		fields: [categories.parent_id],
		references: [categories.id],
		relationName: "categories_parent_id_categories_id"
	}),
	categories: many(categories, {
		relationName: "categories_parent_id_categories_id"
	}),
	products_category_id: many(products, {
		relationName: "products_category_id_categories_id"
	}),
	products_sub_category_id: many(products, {
		relationName: "products_sub_category_id_categories_id"
	}),
}));

export const invoicesRelations = relations(invoices, ({one}) => ({
	order: one(orders, {
		fields: [invoices.order_id],
		references: [orders.id]
	}),
}));

export const ordersRelations = relations(orders, ({one, many}) => ({
	invoices: many(invoices),
	order_items: many(order_items),
	payments: many(payments),
	discount_code: one(discount_codes, {
		fields: [orders.discount_code_id],
		references: [discount_codes.id]
	}),
	user: one(users, {
		fields: [orders.user_id],
		references: [users.id]
	}),
}));

export const order_itemsRelations = relations(order_items, ({one}) => ({
	order: one(orders, {
		fields: [order_items.order_id],
		references: [orders.id]
	}),
	product: one(products, {
		fields: [order_items.product_id],
		references: [products.id]
	}),
}));

export const paymentsRelations = relations(payments, ({one}) => ({
	order: one(orders, {
		fields: [payments.order_id],
		references: [orders.id]
	}),
	user: one(users, {
		fields: [payments.user_id],
		references: [users.id]
	}),
}));

export const product_imagesRelations = relations(product_images, ({one}) => ({
	product: one(products, {
		fields: [product_images.product_id],
		references: [products.id]
	}),
}));

export const retailer_pricingRelations = relations(retailer_pricing, ({one}) => ({
	product: one(products, {
		fields: [retailer_pricing.product_id],
		references: [products.id]
	}),
}));

export const vendor_pricingRelations = relations(vendor_pricing, ({one}) => ({
	product: one(products, {
		fields: [vendor_pricing.product_id],
		references: [products.id]
	}),
}));

export const discount_codesRelations = relations(discount_codes, ({many}) => ({
	orders: many(orders),
}));