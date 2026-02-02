#!/usr/bin/env tsx
/**
 * Seed Supabase production database with products, ingredients, bill of materials, freezers, and freezer stock
 * 
 * Usage:
 *   npx tsx scripts/seed-supabase.ts
 * 
 * Or with inline URL:
 *   SUPABASE_DATABASE_URL='postgresql://...' npx tsx scripts/seed-supabase.ts
 */
import postgres from "postgres";

const SUPABASE_URL = process.env.SUPABASE_DATABASE_URL;

if (!SUPABASE_URL) {
  console.error("Error: SUPABASE_DATABASE_URL environment variable is not set.");
  console.error("");
  console.error("Run with:");
  console.error("   SUPABASE_DATABASE_URL='postgresql://...' npx tsx scripts/seed-supabase.ts");
  process.exit(1);
}

const sql = postgres(SUPABASE_URL, { prepare: false });

async function seed() {
  console.log("🌱 Seeding Supabase database...");
  console.log("");

  try {
    // Seed Ingredients
    console.log("📦 Seeding ingredients...");
    await sql`
      INSERT INTO ingredients (id, name, unit, on_hand, reorder_threshold, cost_per_unit)
      VALUES 
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
      ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name,
        unit = EXCLUDED.unit,
        on_hand = EXCLUDED.on_hand,
        reorder_threshold = EXCLUDED.reorder_threshold,
        cost_per_unit = EXCLUDED.cost_per_unit
    `;
    console.log("   ✓ 12 ingredients seeded");

    // Seed Products
    console.log("🥯 Seeding products...");
    await sql`
      INSERT INTO products (id, name, description, price, is_active)
      VALUES 
        ('prod-plain', 'Plain Spelt Bagel', 'Classic spelt bagel with a perfect chewy texture', 3.50, true),
        ('prod-everything', 'Everything Spelt Bagel', 'Topped with sesame, poppy, onion, garlic, and salt', 4.00, true),
        ('prod-sesame', 'Sesame Spelt Bagel', 'Generously coated with toasted sesame seeds', 3.75, true),
        ('prod-poppy', 'Poppy Seed Spelt Bagel', 'Classic poppy seed topping on spelt dough', 3.75, true),
        ('prod-cinnamon', 'Cinnamon Raisin Spelt Bagel', 'Sweet cinnamon swirl with golden raisins', 4.25, true),
        ('prod-onion', 'Onion Spelt Bagel', 'Savory dried onion topping', 3.75, true)
      ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        is_active = EXCLUDED.is_active
    `;
    console.log("   ✓ 6 products seeded");

    // Seed Bill of Materials
    console.log("📋 Seeding bill of materials (recipes)...");
    
    // Clear existing BOM first to avoid duplicates
    await sql`DELETE FROM bill_of_materials WHERE id LIKE 'bom-%'`;
    
    await sql`
      INSERT INTO bill_of_materials (id, product_id, ingredient_id, quantity)
      VALUES 
        -- Plain bagel base
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
    `;
    console.log("   ✓ 45 BOM entries seeded (recipes linked)");

    // Seed Locations
    console.log("📍 Seeding locations...");
    await sql`
      INSERT INTO locations (id, name, type, address, latitude, longitude, is_active)
      VALUES 
        ('loc-basement', 'D''havi Basement Kitchen', 'basement', '123 Bakery Lane, Brooklyn, NY 11201', 40.6892, -73.9857, true),
        ('loc-market', 'Brooklyn Flea Market', 'popup', '80 Pearl Street, Brooklyn, NY 11201', 40.7033, -73.9903, true),
        ('loc-cafe', 'Corner Cafe Wholesale', 'wholesale', '456 Coffee Ave, Brooklyn, NY 11215', 40.6782, -73.9772, true)
      ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        address = EXCLUDED.address,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        is_active = EXCLUDED.is_active
    `;
    console.log("   ✓ 3 locations seeded");

    // Seed Freezers
    console.log("❄️ Seeding freezers...");
    await sql`
      INSERT INTO freezers (id, name)
      VALUES 
        ('freezer-main', 'Main Kitchen Freezer'),
        ('freezer-backup', 'Backup Freezer'),
        ('freezer-delivery', 'Delivery Freezer')
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    `;
    console.log("   ✓ 3 freezers seeded");

    // Seed Freezer Stock
    console.log("🧊 Seeding freezer stock...");
    
    // Clear existing stock first
    await sql`DELETE FROM freezer_stock WHERE id LIKE 'stock-%'`;
    
    await sql`
      INSERT INTO freezer_stock (id, product_id, freezer_id, quantity, notes)
      VALUES 
        ('stock-plain-main', 'prod-plain', 'freezer-main', 24, 'Initial stock'),
        ('stock-everything-main', 'prod-everything', 'freezer-main', 18, 'Initial stock'),
        ('stock-sesame-main', 'prod-sesame', 'freezer-main', 12, 'Initial stock'),
        ('stock-poppy-main', 'prod-poppy', 'freezer-main', 10, 'Initial stock'),
        ('stock-cinnamon-main', 'prod-cinnamon', 'freezer-main', 15, 'Initial stock'),
        ('stock-onion-main', 'prod-onion', 'freezer-main', 8, 'Initial stock'),
        ('stock-plain-backup', 'prod-plain', 'freezer-backup', 12, 'Backup stock'),
        ('stock-everything-backup', 'prod-everything', 'freezer-backup', 6, 'Backup stock')
    `;
    console.log("   ✓ 8 freezer stock entries seeded");

    console.log("");
    console.log("✅ Seeding complete!");
    console.log("");
    console.log("Summary:");
    console.log("  • 12 ingredients (Pantry)");
    console.log("  • 6 bagel products");
    console.log("  • 45 recipe entries (Bill of Materials)");
    console.log("  • 3 locations");
    console.log("  • 3 freezers");
    console.log("  • 8 freezer stock entries");

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

seed();
