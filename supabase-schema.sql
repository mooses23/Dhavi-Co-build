-- D'havi.co Complete Database Schema for Supabase
-- Run this in Supabase SQL Editor to create all tables
-- Generated from shared/schema.ts

-- ============================================
-- DROP EXISTING TABLES (if starting fresh)
-- Uncomment these lines if you need to reset the database
-- ============================================
-- DROP TABLE IF EXISTS activity_logs CASCADE;
-- DROP TABLE IF EXISTS invoice_items CASCADE;
-- DROP TABLE IF EXISTS invoices CASCADE;
-- DROP TABLE IF EXISTS inventory_adjustments CASCADE;
-- DROP TABLE IF EXISTS freezer_stock CASCADE;
-- DROP TABLE IF EXISTS freezers CASCADE;
-- DROP TABLE IF EXISTS order_items CASCADE;
-- DROP TABLE IF EXISTS orders CASCADE;
-- DROP TABLE IF EXISTS location_inventory CASCADE;
-- DROP TABLE IF EXISTS batch_items CASCADE;
-- DROP TABLE IF EXISTS batches CASCADE;
-- DROP TABLE IF EXISTS bill_of_materials CASCADE;
-- DROP TABLE IF EXISTS marketing_assets CASCADE;
-- DROP TABLE IF EXISTS locations CASCADE;
-- DROP TABLE IF EXISTS products CASCADE;
-- DROP TABLE IF EXISTS ingredients CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS sessions CASCADE;
-- DROP TABLE IF EXISTS session CASCADE;

-- ============================================
-- SESSIONS - Express session storage
-- ============================================
CREATE TABLE IF NOT EXISTS "sessions" (
  "sid" varchar PRIMARY KEY,
  "sess" jsonb NOT NULL,
  "expire" timestamp(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" ("expire");

-- Alternative session table (for connect-pg-simple compatibility)
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar PRIMARY KEY,
  "sess" jsonb NOT NULL,
  "expire" timestamp(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_session_expire" ON "session" ("expire");

-- ============================================
-- USERS - User accounts
-- ============================================
CREATE TABLE IF NOT EXISTS "users" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  "email" varchar UNIQUE,
  "first_name" varchar,
  "last_name" varchar,
  "profile_image_url" varchar,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- ============================================
-- INGREDIENTS - Raw materials inventory
-- ============================================
CREATE TABLE IF NOT EXISTS "ingredients" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  "name" text NOT NULL,
  "unit" text NOT NULL,
  "on_hand" decimal(10, 2) NOT NULL DEFAULT 0,
  "reorder_threshold" decimal(10, 2) NOT NULL DEFAULT 0,
  "cost_per_unit" decimal(10, 4) DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- ============================================
-- PRODUCTS - Bagel SKUs
-- ============================================
CREATE TABLE IF NOT EXISTS "products" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  "name" text NOT NULL,
  "description" text,
  "price" decimal(10, 2) NOT NULL,
  "image_url" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- ============================================
-- BILL OF MATERIALS - Ingredients per product
-- ============================================
CREATE TABLE IF NOT EXISTS "bill_of_materials" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  "product_id" varchar NOT NULL REFERENCES "products"("id"),
  "ingredient_id" varchar NOT NULL REFERENCES "ingredients"("id"),
  "quantity" decimal(10, 4) NOT NULL
);

-- ============================================
-- LOCATIONS - Pickup/delivery locations
-- ============================================
CREATE TABLE IF NOT EXISTS "locations" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "address" text,
  "latitude" double precision,
  "longitude" double precision,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- ============================================
-- BATCHES - Production runs
-- ============================================
CREATE TABLE IF NOT EXISTS "batches" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  "batch_date" timestamp NOT NULL,
  "shift" text,
  "notes" text,
  "status" text NOT NULL DEFAULT 'planned',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- ============================================
-- BATCH ITEMS - Products in a batch
-- ============================================
CREATE TABLE IF NOT EXISTS "batch_items" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  "batch_id" varchar NOT NULL REFERENCES "batches"("id"),
  "product_id" varchar NOT NULL REFERENCES "products"("id"),
  "quantity" integer NOT NULL
);

-- ============================================
-- LOCATION INVENTORY - Stock at locations
-- ============================================
CREATE TABLE IF NOT EXISTS "location_inventory" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  "location_id" varchar NOT NULL REFERENCES "locations"("id"),
  "product_id" varchar NOT NULL REFERENCES "products"("id"),
  "quantity" integer NOT NULL DEFAULT 0,
  "updated_at" timestamp DEFAULT now()
);

-- ============================================
-- ORDERS - Customer orders
-- ============================================
CREATE TABLE IF NOT EXISTS "orders" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  "customer_name" text NOT NULL,
  "customer_email" text NOT NULL,
  "customer_phone" text,
  "delivery_address" text NOT NULL,
  "delivery_city" text NOT NULL,
  "delivery_state" text NOT NULL,
  "delivery_zip" text NOT NULL,
  "delivery_instructions" text,
  "location_id" varchar REFERENCES "locations"("id"),
  "fulfillment_date" timestamp NOT NULL,
  "fulfillment_window" text,
  "status" text NOT NULL DEFAULT 'new',
  "subtotal" decimal(10, 2) NOT NULL,
  "total" decimal(10, 2) NOT NULL,
  "stripe_payment_intent_id" text,
  "stripe_payment_status" text,
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_orders_status" ON "orders" ("status");
CREATE INDEX IF NOT EXISTS "idx_orders_fulfillment_date" ON "orders" ("fulfillment_date");

-- ============================================
-- ORDER ITEMS - Products in an order
-- ============================================
CREATE TABLE IF NOT EXISTS "order_items" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  "order_id" varchar NOT NULL REFERENCES "orders"("id"),
  "product_id" varchar NOT NULL REFERENCES "products"("id"),
  "quantity" integer NOT NULL,
  "unit_price" decimal(10, 2) NOT NULL,
  "total" decimal(10, 2) NOT NULL
);

-- ============================================
-- MARKETING ASSETS - Brand photos
-- ============================================
CREATE TABLE IF NOT EXISTS "marketing_assets" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  "name" text NOT NULL,
  "asset_type" text NOT NULL,
  "usage_context" text NOT NULL,
  "image_url" text,
  "notes" text,
  "product_id" varchar REFERENCES "products"("id"),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- ============================================
-- INVOICES - Generated from orders
-- ============================================
CREATE TABLE IF NOT EXISTS "invoices" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  "invoice_number" text NOT NULL UNIQUE,
  "order_id" varchar NOT NULL REFERENCES "orders"("id"),
  "customer_name" text NOT NULL,
  "customer_email" text NOT NULL,
  "customer_phone" text,
  "delivery_address" text NOT NULL,
  "delivery_city" text NOT NULL,
  "delivery_state" text NOT NULL,
  "delivery_zip" text NOT NULL,
  "subtotal" decimal(10, 2) NOT NULL,
  "tax" decimal(10, 2) NOT NULL DEFAULT 0,
  "total" decimal(10, 2) NOT NULL,
  "status" text NOT NULL DEFAULT 'draft',
  "issued_at" timestamp DEFAULT now(),
  "paid_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- ============================================
-- INVOICE ITEMS - Line items
-- ============================================
CREATE TABLE IF NOT EXISTS "invoice_items" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  "invoice_id" varchar NOT NULL REFERENCES "invoices"("id"),
  "product_id" varchar NOT NULL REFERENCES "products"("id"),
  "product_name" text NOT NULL,
  "quantity" integer NOT NULL,
  "unit_price" decimal(10, 2) NOT NULL,
  "total" decimal(10, 2) NOT NULL
);

-- ============================================
-- INVENTORY ADJUSTMENTS - Track changes
-- ============================================
CREATE TABLE IF NOT EXISTS "inventory_adjustments" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  "ingredient_id" varchar NOT NULL REFERENCES "ingredients"("id"),
  "adjustment_type" text NOT NULL,
  "quantity" decimal(10, 2) NOT NULL,
  "previous_quantity" decimal(10, 2) NOT NULL,
  "new_quantity" decimal(10, 2) NOT NULL,
  "reason" text,
  "adjusted_by" text,
  "created_at" timestamp DEFAULT now()
);

-- ============================================
-- FREEZERS - Physical freezer units
-- ============================================
CREATE TABLE IF NOT EXISTS "freezers" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  "name" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

-- ============================================
-- FREEZER STOCK - Finished goods in freezer
-- ============================================
CREATE TABLE IF NOT EXISTS "freezer_stock" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  "product_id" varchar NOT NULL REFERENCES "products"("id"),
  "freezer_id" varchar REFERENCES "freezers"("id"),
  "quantity" integer NOT NULL DEFAULT 0,
  "batch_id" varchar REFERENCES "batches"("id"),
  "frozen_at" timestamp DEFAULT now(),
  "expires_at" timestamp,
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_freezer_stock_product" ON "freezer_stock" ("product_id");
CREATE INDEX IF NOT EXISTS "idx_freezer_stock_batch" ON "freezer_stock" ("batch_id");

-- ============================================
-- ACTIVITY LOGS - Audit trail
-- ============================================
CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  "action_type" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" varchar,
  "user_id" text,
  "user_name" text,
  "details" jsonb,
  "ip_address" text,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_activity_logs_entity" ON "activity_logs" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_activity_logs_user" ON "activity_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_activity_logs_created" ON "activity_logs" ("created_at");

-- ============================================
-- SEED DATA - Sample products and ingredients
-- ============================================

-- Insert sample ingredients
INSERT INTO "ingredients" ("id", "name", "unit", "on_hand", "reorder_threshold", "cost_per_unit") VALUES
  ('ing-flour', 'Spelt Flour', 'lb', 50.00, 20.00, 2.50),
  ('ing-water', 'Water', 'gal', 100.00, 10.00, 0.01),
  ('ing-yeast', 'Active Dry Yeast', 'oz', 16.00, 8.00, 0.75),
  ('ing-salt', 'Sea Salt', 'oz', 32.00, 8.00, 0.15),
  ('ing-honey', 'Raw Honey', 'oz', 24.00, 12.00, 0.85),
  ('ing-malt', 'Barley Malt Syrup', 'oz', 16.00, 8.00, 0.60),
  ('ing-sesame', 'Sesame Seeds', 'oz', 12.00, 6.00, 0.45),
  ('ing-poppy', 'Poppy Seeds', 'oz', 8.00, 4.00, 0.55),
  ('ing-onion', 'Dried Onion Flakes', 'oz', 10.00, 5.00, 0.35),
  ('ing-garlic', 'Dried Garlic', 'oz', 8.00, 4.00, 0.40),
  ('ing-cinnamon', 'Ceylon Cinnamon', 'oz', 6.00, 3.00, 1.20),
  ('ing-raisins', 'Golden Raisins', 'oz', 12.00, 6.00, 0.65)
ON CONFLICT ("id") DO UPDATE SET 
  "name" = EXCLUDED."name",
  "unit" = EXCLUDED."unit",
  "on_hand" = EXCLUDED."on_hand",
  "reorder_threshold" = EXCLUDED."reorder_threshold",
  "cost_per_unit" = EXCLUDED."cost_per_unit";

-- Insert sample products (bagel varieties)
INSERT INTO "products" ("id", "name", "description", "price", "is_active") VALUES
  ('prod-plain', 'Plain Spelt Bagel', 'Classic spelt bagel with a perfect chewy texture', 3.50, true),
  ('prod-everything', 'Everything Spelt Bagel', 'Topped with sesame, poppy, onion, garlic, and salt', 4.00, true),
  ('prod-sesame', 'Sesame Spelt Bagel', 'Generously coated with toasted sesame seeds', 3.75, true),
  ('prod-poppy', 'Poppy Seed Spelt Bagel', 'Classic poppy seed topping on spelt dough', 3.75, true),
  ('prod-cinnamon', 'Cinnamon Raisin Spelt Bagel', 'Sweet cinnamon swirl with golden raisins', 4.25, true),
  ('prod-onion', 'Onion Spelt Bagel', 'Savory dried onion topping', 3.75, true)
ON CONFLICT ("id") DO UPDATE SET 
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "price" = EXCLUDED."price",
  "is_active" = EXCLUDED."is_active";

-- Insert bill of materials (ingredients per bagel - amounts per single bagel)
INSERT INTO "bill_of_materials" ("id", "product_id", "ingredient_id", "quantity") VALUES
  -- Plain bagel base (used for all)
  ('bom-plain-flour', 'prod-plain', 'ing-flour', 0.25),
  ('bom-plain-water', 'prod-plain', 'ing-water', 0.03),
  ('bom-plain-yeast', 'prod-plain', 'ing-yeast', 0.10),
  ('bom-plain-salt', 'prod-plain', 'ing-salt', 0.15),
  ('bom-plain-honey', 'prod-plain', 'ing-honey', 0.20),
  ('bom-plain-malt', 'prod-plain', 'ing-malt', 0.15),
  -- Everything bagel
  ('bom-everything-flour', 'prod-everything', 'ing-flour', 0.25),
  ('bom-everything-water', 'prod-everything', 'ing-water', 0.03),
  ('bom-everything-yeast', 'prod-everything', 'ing-yeast', 0.10),
  ('bom-everything-salt', 'prod-everything', 'ing-salt', 0.20),
  ('bom-everything-honey', 'prod-everything', 'ing-honey', 0.20),
  ('bom-everything-malt', 'prod-everything', 'ing-malt', 0.15),
  ('bom-everything-sesame', 'prod-everything', 'ing-sesame', 0.15),
  ('bom-everything-poppy', 'prod-everything', 'ing-poppy', 0.10),
  ('bom-everything-onion', 'prod-everything', 'ing-onion', 0.10),
  ('bom-everything-garlic', 'prod-everything', 'ing-garlic', 0.10),
  -- Sesame bagel
  ('bom-sesame-flour', 'prod-sesame', 'ing-flour', 0.25),
  ('bom-sesame-water', 'prod-sesame', 'ing-water', 0.03),
  ('bom-sesame-yeast', 'prod-sesame', 'ing-yeast', 0.10),
  ('bom-sesame-salt', 'prod-sesame', 'ing-salt', 0.15),
  ('bom-sesame-honey', 'prod-sesame', 'ing-honey', 0.20),
  ('bom-sesame-malt', 'prod-sesame', 'ing-malt', 0.15),
  ('bom-sesame-sesame', 'prod-sesame', 'ing-sesame', 0.25),
  -- Poppy bagel
  ('bom-poppy-flour', 'prod-poppy', 'ing-flour', 0.25),
  ('bom-poppy-water', 'prod-poppy', 'ing-water', 0.03),
  ('bom-poppy-yeast', 'prod-poppy', 'ing-yeast', 0.10),
  ('bom-poppy-salt', 'prod-poppy', 'ing-salt', 0.15),
  ('bom-poppy-honey', 'prod-poppy', 'ing-honey', 0.20),
  ('bom-poppy-malt', 'prod-poppy', 'ing-malt', 0.15),
  ('bom-poppy-poppy', 'prod-poppy', 'ing-poppy', 0.20),
  -- Cinnamon Raisin bagel
  ('bom-cinnamon-flour', 'prod-cinnamon', 'ing-flour', 0.25),
  ('bom-cinnamon-water', 'prod-cinnamon', 'ing-water', 0.03),
  ('bom-cinnamon-yeast', 'prod-cinnamon', 'ing-yeast', 0.10),
  ('bom-cinnamon-salt', 'prod-cinnamon', 'ing-salt', 0.10),
  ('bom-cinnamon-honey', 'prod-cinnamon', 'ing-honey', 0.30),
  ('bom-cinnamon-malt', 'prod-cinnamon', 'ing-malt', 0.15),
  ('bom-cinnamon-cinnamon', 'prod-cinnamon', 'ing-cinnamon', 0.15),
  ('bom-cinnamon-raisins', 'prod-cinnamon', 'ing-raisins', 0.35),
  -- Onion bagel
  ('bom-onion-flour', 'prod-onion', 'ing-flour', 0.25),
  ('bom-onion-water', 'prod-onion', 'ing-water', 0.03),
  ('bom-onion-yeast', 'prod-onion', 'ing-yeast', 0.10),
  ('bom-onion-salt', 'prod-onion', 'ing-salt', 0.15),
  ('bom-onion-honey', 'prod-onion', 'ing-honey', 0.20),
  ('bom-onion-malt', 'prod-onion', 'ing-malt', 0.15),
  ('bom-onion-onion', 'prod-onion', 'ing-onion', 0.25)
ON CONFLICT ("id") DO UPDATE SET 
  "product_id" = EXCLUDED."product_id",
  "ingredient_id" = EXCLUDED."ingredient_id",
  "quantity" = EXCLUDED."quantity";

-- Insert sample locations
INSERT INTO "locations" ("id", "name", "type", "address", "latitude", "longitude", "is_active") VALUES
  ('loc-basement', 'D''havi Basement Kitchen', 'basement', '123 Bakery Lane, Brooklyn, NY 11201', 40.6892, -73.9857, true),
  ('loc-market', 'Brooklyn Flea Market', 'popup', '80 Pearl Street, Brooklyn, NY 11201', 40.7033, -73.9903, true),
  ('loc-cafe', 'Corner Cafe Wholesale', 'wholesale', '456 Coffee Ave, Brooklyn, NY 11215', 40.6782, -73.9772, true)
ON CONFLICT ("id") DO UPDATE SET 
  "name" = EXCLUDED."name",
  "type" = EXCLUDED."type",
  "address" = EXCLUDED."address",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "is_active" = EXCLUDED."is_active";

-- Insert a sample freezer
INSERT INTO "freezers" ("id", "name") VALUES
  ('freezer-main', 'Main Kitchen Freezer'),
  ('freezer-backup', 'Backup Freezer')
ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name";

-- Insert some initial freezer stock
INSERT INTO "freezer_stock" ("id", "product_id", "freezer_id", "quantity", "notes") VALUES
  ('stock-plain-1', 'prod-plain', 'freezer-main', 24, 'Initial stock'),
  ('stock-everything-1', 'prod-everything', 'freezer-main', 18, 'Initial stock'),
  ('stock-sesame-1', 'prod-sesame', 'freezer-main', 12, 'Initial stock'),
  ('stock-cinnamon-1', 'prod-cinnamon', 'freezer-main', 12, 'Initial stock')
ON CONFLICT ("id") DO UPDATE SET 
  "product_id" = EXCLUDED."product_id",
  "freezer_id" = EXCLUDED."freezer_id",
  "quantity" = EXCLUDED."quantity",
  "notes" = EXCLUDED."notes";

-- Success message
SELECT 'D''havi.co schema and seed data imported successfully!' as status;
