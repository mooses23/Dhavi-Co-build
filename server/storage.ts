import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { db } from "./db.js";
import {
  ingredients,
  products,
  billOfMaterials,
  locations,
  batches,
  batchItems,
  locationInventory,
  orders,
  orderItems,
  marketingAssets,
  invoices,
  invoiceItems,
  inventoryAdjustments,
  type Ingredient,
  type InsertIngredient,
  type Product,
  type InsertProduct,
  type BillOfMaterial,
  type InsertBom,
  type Location,
  type InsertLocation,
  type Batch,
  type InsertBatch,
  type BatchItem,
  type InsertBatchItem,
  type LocationInventory,
  type InsertLocationInventory,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type MarketingAsset,
  type InsertMarketingAsset,
  type Invoice,
  type InsertInvoice,
  type InvoiceItem,
  type InsertInvoiceItem,
  type InventoryAdjustment,
  type InsertInventoryAdjustment,
} from "@shared/schema";

export interface IStorage {
  // Ingredients
  getIngredients(): Promise<Ingredient[]>;
  getIngredient(id: string): Promise<Ingredient | undefined>;
  createIngredient(data: InsertIngredient): Promise<Ingredient>;
  updateIngredient(id: string, data: Partial<InsertIngredient>): Promise<Ingredient | undefined>;
  deductIngredients(deductions: { ingredientId: string; quantity: number }[]): Promise<void>;

  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(data: InsertProduct): Promise<Product>;
  updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<void>;

  // Bill of Materials
  getBomForProduct(productId: string): Promise<(BillOfMaterial & { ingredient: Ingredient })[]>;
  createBom(data: InsertBom): Promise<BillOfMaterial>;
  deleteBomForProduct(productId: string): Promise<void>;

  // Locations
  getLocations(): Promise<Location[]>;
  getLocation(id: string): Promise<Location | undefined>;
  createLocation(data: InsertLocation): Promise<Location>;
  updateLocation(id: string, data: Partial<InsertLocation>): Promise<Location | undefined>;

  // Batches
  getBatches(): Promise<(Batch & { items: (BatchItem & { product: Product })[] })[]>;
  getBatch(id: string): Promise<Batch | undefined>;
  createBatch(data: InsertBatch): Promise<Batch>;
  updateBatchStatus(id: string, status: string): Promise<Batch | undefined>;
  createBatchItem(data: InsertBatchItem): Promise<BatchItem>;

  // Location Inventory
  getLocationInventory(locationId: string): Promise<(LocationInventory & { product: Product })[]>;
  updateLocationInventory(locationId: string, productId: string, delta: number): Promise<void>;

  // Orders
  getOrders(): Promise<(Order & { location?: Location; items: (OrderItem & { product: Product })[] })[]>;
  getOrder(id: string): Promise<(Order & { location?: Location; items: (OrderItem & { product: Product })[] }) | undefined>;
  createOrder(data: InsertOrder): Promise<Order>;
  updateOrder(id: string, data: Partial<InsertOrder>): Promise<Order | undefined>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  createOrderItem(data: InsertOrderItem): Promise<OrderItem>;

  // Marketing Assets
  getMarketingAssets(): Promise<MarketingAsset[]>;
  createMarketingAsset(data: InsertMarketingAsset): Promise<MarketingAsset>;

  // Invoices
  getInvoices(): Promise<(Invoice & { items: InvoiceItem[] })[]>;
  getInvoice(id: string): Promise<(Invoice & { items: InvoiceItem[] }) | undefined>;
  getInvoiceByOrderId(orderId: string): Promise<Invoice | undefined>;
  createInvoice(data: InsertInvoice): Promise<Invoice>;
  createInvoiceItem(data: InsertInvoiceItem): Promise<InvoiceItem>;
  updateInvoiceStatus(id: string, status: string): Promise<Invoice | undefined>;
  getNextInvoiceNumber(): Promise<string>;

  // Inventory Adjustments
  getInventoryAdjustments(ingredientId?: string): Promise<(InventoryAdjustment & { ingredient: Ingredient })[]>;
  createInventoryAdjustment(data: InsertInventoryAdjustment): Promise<InventoryAdjustment>;
  adjustIngredientInventory(ingredientId: string, quantity: number, type: string, reason?: string, adjustedBy?: string): Promise<InventoryAdjustment>;
}

export class DatabaseStorage implements IStorage {
  // Ingredients
  async getIngredients(): Promise<Ingredient[]> {
    return db.select().from(ingredients).orderBy(ingredients.name);
  }

  async getIngredient(id: string): Promise<Ingredient | undefined> {
    const [ingredient] = await db.select().from(ingredients).where(eq(ingredients.id, id));
    return ingredient;
  }

  async createIngredient(data: InsertIngredient): Promise<Ingredient> {
    const [ingredient] = await db.insert(ingredients).values(data).returning();
    return ingredient;
  }

  async updateIngredient(id: string, data: Partial<InsertIngredient>): Promise<Ingredient | undefined> {
    const [ingredient] = await db
      .update(ingredients)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(ingredients.id, id))
      .returning();
    return ingredient;
  }

  async deductIngredients(deductions: { ingredientId: string; quantity: number }[]): Promise<void> {
    for (const { ingredientId, quantity } of deductions) {
      await db
        .update(ingredients)
        .set({
          onHand: sql`${ingredients.onHand} - ${quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(ingredients.id, ingredientId));
    }
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return db.select().from(products).orderBy(products.name);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(data: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(data).returning();
    return product;
  }

  async updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    // First delete related BOM entries
    await db.delete(billOfMaterials).where(eq(billOfMaterials.productId, id));
    // Then delete the product
    await db.delete(products).where(eq(products.id, id));
  }

  // Bill of Materials
  async getBomForProduct(productId: string): Promise<(BillOfMaterial & { ingredient: Ingredient })[]> {
    const boms = await db
      .select()
      .from(billOfMaterials)
      .innerJoin(ingredients, eq(billOfMaterials.ingredientId, ingredients.id))
      .where(eq(billOfMaterials.productId, productId));
    
    return boms.map((row) => ({
      ...row.bill_of_materials,
      ingredient: row.ingredients,
    }));
  }

  async createBom(data: InsertBom): Promise<BillOfMaterial> {
    const [bom] = await db.insert(billOfMaterials).values(data).returning();
    return bom;
  }

  async deleteBomForProduct(productId: string): Promise<void> {
    await db.delete(billOfMaterials).where(eq(billOfMaterials.productId, productId));
  }

  // Locations
  async getLocations(): Promise<Location[]> {
    return db.select().from(locations).orderBy(locations.name);
  }

  async getLocation(id: string): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(eq(locations.id, id));
    return location;
  }

  async createLocation(data: InsertLocation): Promise<Location> {
    const [location] = await db.insert(locations).values(data).returning();
    return location;
  }

  async updateLocation(id: string, data: Partial<InsertLocation>): Promise<Location | undefined> {
    const [location] = await db
      .update(locations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(locations.id, id))
      .returning();
    return location;
  }

  // Batches
  async getBatches(): Promise<(Batch & { items: (BatchItem & { product: Product })[] })[]> {
    const allBatches = await db.select().from(batches).orderBy(desc(batches.batchDate));
    
    const result = [];
    for (const batch of allBatches) {
      const items = await db
        .select()
        .from(batchItems)
        .innerJoin(products, eq(batchItems.productId, products.id))
        .where(eq(batchItems.batchId, batch.id));
      
      result.push({
        ...batch,
        items: items.map((row) => ({
          ...row.batch_items,
          product: row.products,
        })),
      });
    }
    
    return result;
  }

  async getBatch(id: string): Promise<Batch | undefined> {
    const [batch] = await db.select().from(batches).where(eq(batches.id, id));
    return batch;
  }

  async createBatch(data: InsertBatch): Promise<Batch> {
    const [batch] = await db.insert(batches).values(data).returning();
    return batch;
  }

  async updateBatchStatus(id: string, status: string): Promise<Batch | undefined> {
    const [batch] = await db
      .update(batches)
      .set({ status, updatedAt: new Date() })
      .where(eq(batches.id, id))
      .returning();
    return batch;
  }

  async createBatchItem(data: InsertBatchItem): Promise<BatchItem> {
    const [item] = await db.insert(batchItems).values(data).returning();
    return item;
  }

  async getBatchItems(batchId: string): Promise<BatchItem[]> {
    return db.select().from(batchItems).where(eq(batchItems.batchId, batchId));
  }

  // Location Inventory
  async getLocationInventory(locationId: string): Promise<(LocationInventory & { product: Product })[]> {
    const inventory = await db
      .select()
      .from(locationInventory)
      .innerJoin(products, eq(locationInventory.productId, products.id))
      .where(eq(locationInventory.locationId, locationId));
    
    return inventory.map((row) => ({
      ...row.location_inventory,
      product: row.products,
    }));
  }

  async updateLocationInventory(locationId: string, productId: string, delta: number): Promise<void> {
    const [existing] = await db
      .select()
      .from(locationInventory)
      .where(and(
        eq(locationInventory.locationId, locationId),
        eq(locationInventory.productId, productId)
      ));

    if (existing) {
      await db
        .update(locationInventory)
        .set({
          quantity: existing.quantity + delta,
          updatedAt: new Date(),
        })
        .where(eq(locationInventory.id, existing.id));
    } else {
      await db.insert(locationInventory).values({
        locationId,
        productId,
        quantity: delta,
      });
    }
  }

  // Orders
  async getOrders(): Promise<(Order & { location?: Location; items: (OrderItem & { product: Product })[] })[]> {
    const allOrders = await db
      .select()
      .from(orders)
      .leftJoin(locations, eq(orders.locationId, locations.id))
      .orderBy(desc(orders.createdAt));
    
    const result = [];
    for (const row of allOrders) {
      const items = await db
        .select()
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, row.orders.id));
      
      result.push({
        ...row.orders,
        location: row.locations || undefined,
        items: items.map((itemRow) => ({
          ...itemRow.order_items,
          product: itemRow.products,
        })),
      });
    }
    
    return result;
  }

  async getOrder(id: string): Promise<(Order & { location?: Location; items: (OrderItem & { product: Product })[] }) | undefined> {
    const [row] = await db
      .select()
      .from(orders)
      .leftJoin(locations, eq(orders.locationId, locations.id))
      .where(eq(orders.id, id));
    
    if (!row) return undefined;

    const items = await db
      .select()
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, id));
    
    return {
      ...row.orders,
      location: row.locations || undefined,
      items: items.map((itemRow) => ({
        ...itemRow.order_items,
        product: itemRow.products,
      })),
    };
  }

  async createOrder(data: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(data).returning();
    return order;
  }

  async updateOrder(id: string, data: Partial<InsertOrder>): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async createOrderItem(data: InsertOrderItem): Promise<OrderItem> {
    const [item] = await db.insert(orderItems).values(data).returning();
    return item;
  }

  // Marketing Assets
  async getMarketingAssets(): Promise<MarketingAsset[]> {
    return db.select().from(marketingAssets).orderBy(marketingAssets.name);
  }

  async createMarketingAsset(data: InsertMarketingAsset): Promise<MarketingAsset> {
    const [asset] = await db.insert(marketingAssets).values(data).returning();
    return asset;
  }

  // Invoices
  async getInvoices(): Promise<(Invoice & { items: InvoiceItem[] })[]> {
    const allInvoices = await db.select().from(invoices).orderBy(desc(invoices.createdAt));
    
    const result = [];
    for (const invoice of allInvoices) {
      const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id));
      result.push({ ...invoice, items });
    }
    
    return result;
  }

  async getInvoice(id: string): Promise<(Invoice & { items: InvoiceItem[] }) | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    if (!invoice) return undefined;

    const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    return { ...invoice, items };
  }

  async getInvoiceByOrderId(orderId: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.orderId, orderId));
    return invoice;
  }

  async createInvoice(data: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db.insert(invoices).values(data).returning();
    return invoice;
  }

  async createInvoiceItem(data: InsertInvoiceItem): Promise<InvoiceItem> {
    const [item] = await db.insert(invoiceItems).values(data).returning();
    return item;
  }

  async updateInvoiceStatus(id: string, status: string): Promise<Invoice | undefined> {
    const updateData: any = { status, updatedAt: new Date() };
    if (status === "paid") {
      updateData.paidAt = new Date();
    }
    const [invoice] = await db
      .update(invoices)
      .set(updateData)
      .where(eq(invoices.id, id))
      .returning();
    return invoice;
  }

  async getNextInvoiceNumber(): Promise<string> {
    const [latest] = await db
      .select({ invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .orderBy(desc(invoices.createdAt))
      .limit(1);
    
    const year = new Date().getFullYear();
    if (!latest) {
      return `INV-${year}-0001`;
    }
    
    const parts = latest.invoiceNumber.split("-");
    const lastNum = parseInt(parts[2] || "0", 10);
    const nextNum = lastNum + 1;
    return `INV-${year}-${nextNum.toString().padStart(4, "0")}`;
  }

  // Inventory Adjustments
  async getInventoryAdjustments(ingredientId?: string): Promise<(InventoryAdjustment & { ingredient: Ingredient })[]> {
    let query = db
      .select()
      .from(inventoryAdjustments)
      .innerJoin(ingredients, eq(inventoryAdjustments.ingredientId, ingredients.id))
      .orderBy(desc(inventoryAdjustments.createdAt));
    
    if (ingredientId) {
      query = query.where(eq(inventoryAdjustments.ingredientId, ingredientId)) as any;
    }
    
    const results = await query;
    return results.map((row) => ({
      ...row.inventory_adjustments,
      ingredient: row.ingredients,
    }));
  }

  async createInventoryAdjustment(data: InsertInventoryAdjustment): Promise<InventoryAdjustment> {
    const [adjustment] = await db.insert(inventoryAdjustments).values(data).returning();
    return adjustment;
  }

  async adjustIngredientInventory(
    ingredientId: string,
    quantity: number,
    type: string,
    reason?: string,
    adjustedBy?: string
  ): Promise<InventoryAdjustment> {
    const ingredient = await this.getIngredient(ingredientId);
    if (!ingredient) {
      throw new Error("Ingredient not found");
    }

    const previousQuantity = parseFloat(ingredient.onHand);
    const newQuantity = previousQuantity + quantity;

    // Update ingredient inventory
    await db
      .update(ingredients)
      .set({ onHand: newQuantity.toString(), updatedAt: new Date() })
      .where(eq(ingredients.id, ingredientId));

    // Create adjustment record
    const adjustment = await this.createInventoryAdjustment({
      ingredientId,
      adjustmentType: type,
      quantity: quantity.toString(),
      previousQuantity: previousQuantity.toString(),
      newQuantity: newQuantity.toString(),
      reason,
      adjustedBy,
    });

    return adjustment;
  }
}

export const storage = new DatabaseStorage();
