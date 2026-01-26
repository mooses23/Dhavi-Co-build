import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// ============================================
// INGREDIENTS - The truth layer
// ============================================
export const ingredients = pgTable("ingredients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  unit: text("unit").notNull(), // oz, lb, count, etc.
  onHand: decimal("on_hand", { precision: 10, scale: 2 }).notNull().default("0"),
  reorderThreshold: decimal("reorder_threshold", { precision: 10, scale: 2 }).notNull().default("0"),
  costPerUnit: decimal("cost_per_unit", { precision: 10, scale: 4 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertIngredientSchema = createInsertSchema(ingredients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertIngredient = z.infer<typeof insertIngredientSchema>;
export type Ingredient = typeof ingredients.$inferSelect;

// ============================================
// PRODUCTS - Bagel SKUs
// ============================================
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// ============================================
// BILL OF MATERIALS - Ingredients per product
// ============================================
export const billOfMaterials = pgTable("bill_of_materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id),
  ingredientId: varchar("ingredient_id").notNull().references(() => ingredients.id),
  quantity: decimal("quantity", { precision: 10, scale: 4 }).notNull(),
});

export const bomRelations = relations(billOfMaterials, ({ one }) => ({
  product: one(products, {
    fields: [billOfMaterials.productId],
    references: [products.id],
  }),
  ingredient: one(ingredients, {
    fields: [billOfMaterials.ingredientId],
    references: [ingredients.id],
  }),
}));

export const insertBomSchema = createInsertSchema(billOfMaterials).omit({
  id: true,
});

export type InsertBom = z.infer<typeof insertBomSchema>;
export type BillOfMaterial = typeof billOfMaterials.$inferSelect;

// ============================================
// LOCATIONS - Where bagels go
// ============================================
export const locations = pgTable("locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // basement, popup, wholesale, delivery
  address: text("address"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = typeof locations.$inferSelect;

// ============================================
// PRODUCTION BATCHES - Real production runs
// ============================================
export const batches = pgTable("batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchDate: timestamp("batch_date").notNull(),
  shift: text("shift"), // morning, afternoon, evening
  notes: text("notes"),
  status: text("status").notNull().default("planned"), // planned, in_progress, completed, cancelled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBatchSchema = createInsertSchema(batches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBatch = z.infer<typeof insertBatchSchema>;
export type Batch = typeof batches.$inferSelect;

// ============================================
// BATCH ITEMS - Products produced in a batch
// ============================================
export const batchItems = pgTable("batch_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchId: varchar("batch_id").notNull().references(() => batches.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
});

export const batchItemsRelations = relations(batchItems, ({ one }) => ({
  batch: one(batches, {
    fields: [batchItems.batchId],
    references: [batches.id],
  }),
  product: one(products, {
    fields: [batchItems.productId],
    references: [products.id],
  }),
}));

export const insertBatchItemSchema = createInsertSchema(batchItems).omit({
  id: true,
});

export type InsertBatchItem = z.infer<typeof insertBatchItemSchema>;
export type BatchItem = typeof batchItems.$inferSelect;

// ============================================
// LOCATION INVENTORY - Finished goods at locations
// ============================================
export const locationInventory = pgTable("location_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull().references(() => locations.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const locationInventoryRelations = relations(locationInventory, ({ one }) => ({
  location: one(locations, {
    fields: [locationInventory.locationId],
    references: [locations.id],
  }),
  product: one(products, {
    fields: [locationInventory.productId],
    references: [products.id],
  }),
}));

export const insertLocationInventorySchema = createInsertSchema(locationInventory).omit({
  id: true,
  updatedAt: true,
});

export type InsertLocationInventory = z.infer<typeof insertLocationInventorySchema>;
export type LocationInventory = typeof locationInventory.$inferSelect;

// ============================================
// ORDERS - Customer orders
// ============================================
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone"),
  locationId: varchar("location_id").notNull().references(() => locations.id),
  fulfillmentDate: timestamp("fulfillment_date").notNull(),
  fulfillmentWindow: text("fulfillment_window"), // morning, afternoon, evening
  status: text("status").notNull().default("new"), // new, approved, baking, ready, completed, cancelled
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripePaymentStatus: text("stripe_payment_status"), // authorized, captured, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_orders_status").on(table.status),
  index("idx_orders_fulfillment_date").on(table.fulfillmentDate),
]);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  location: one(locations, {
    fields: [orders.locationId],
    references: [locations.id],
  }),
  items: many(orderItems),
}));

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// ============================================
// ORDER ITEMS - Products in an order
// ============================================
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
});

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

// ============================================
// MARKETING ASSETS - Photo-aware brand system
// ============================================
export const marketingAssets = pgTable("marketing_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  assetType: text("asset_type").notNull(), // hero, ingredient, process, lifestyle, packaging
  usageContext: text("usage_context").notNull(), // homepage, product, email, social, wholesale
  imageUrl: text("image_url"),
  notes: text("notes"),
  productId: varchar("product_id").references(() => products.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMarketingAssetSchema = createInsertSchema(marketingAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMarketingAsset = z.infer<typeof insertMarketingAssetSchema>;
export type MarketingAsset = typeof marketingAssets.$inferSelect;

// ============================================
// Order status enum for type safety
// ============================================
export const ORDER_STATUSES = ["new", "approved", "baking", "ready", "completed", "cancelled"] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

export const BATCH_STATUSES = ["planned", "in_progress", "completed", "cancelled"] as const;
export type BatchStatus = typeof BATCH_STATUSES[number];

export const LOCATION_TYPES = ["basement", "popup", "wholesale", "delivery"] as const;
export type LocationType = typeof LOCATION_TYPES[number];

export const FULFILLMENT_WINDOWS = ["morning", "afternoon", "evening"] as const;
export type FulfillmentWindow = typeof FULFILLMENT_WINDOWS[number];
