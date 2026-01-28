import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupSimpleAuth, registerSimpleAuthRoutes, isSimpleAuthenticated } from "./simpleAuth.js";
import { getStripe } from "./lib/stripe.js";
import { storage } from "./storage.js";
import Stripe from "stripe";

import {
  healthCheck,
  getPublicProducts,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductBom,
  updateProductBom,
  getAllIngredients,
  createIngredient,
  updateIngredient,
  getInventoryAdjustments,
  adjustIngredientInventory,
  seedIngredients,
  getPublicLocations,
  getAllLocations,
  createLocation,
  updateLocation,
  getLocationInventory,
  createOrder,
  getPublicOrder,
  getAllOrders,
  updateOrderStatus,
  updateOrder,
  createManualOrder,
  getAllBatches,
  createBatch,
  updateBatchStatus,
  getAllInvoices,
  getInvoice,
  updateInvoiceStatus,
  getAllMarketingAssets,
  createMarketingAsset,
  getDashboardStats,
  getOrderStats,
  getInventoryStats,
  getFreezerStock,
  getFreezerStockByProduct,
  createFreezerStock,
  updateFreezerStock,
  getFreezerStats,
  seedFreezerStock,
  getActivityLogs,
  getRecentActivity,
} from "./controllers/index.js";

import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupSimpleAuth(app);
  registerSimpleAuthRoutes(app);

  // ==========================================
  // HEALTH CHECK
  // ==========================================
  app.get("/api/health", healthCheck);

  // ==========================================
  // PUBLIC ROUTES (Customer-facing)
  // ==========================================
  app.get("/api/products", getPublicProducts);
  app.get("/api/locations", getPublicLocations);
  app.post("/api/orders", createOrder);
  app.get("/api/orders/:id", getPublicOrder);

  // Public freezer availability - returns product quantities for ordering
  app.get("/api/freezer/availability", async (req, res) => {
    try {
      const freezerStock = await storage.getFreezerStock();
      
      const availability: Record<string, number> = {};
      for (const item of freezerStock) {
        if (!availability[item.productId]) {
          availability[item.productId] = 0;
        }
        availability[item.productId] += item.quantity;
      }
      
      res.json(availability);
    } catch (error) {
      console.error("Error fetching freezer availability:", error);
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  // ==========================================
  // ADMIN ROUTES (Protected)
  // ==========================================

  // Orders
  app.get("/api/admin/orders", isSimpleAuthenticated, getAllOrders);
  app.post("/api/admin/orders/manual", isSimpleAuthenticated, createManualOrder);
  app.patch("/api/admin/orders/:id/status", isSimpleAuthenticated, updateOrderStatus);
  app.patch("/api/admin/orders/:id", isSimpleAuthenticated, updateOrder);

  // Products
  app.get("/api/admin/products", isSimpleAuthenticated, getAllProducts);
  app.post("/api/admin/products", isSimpleAuthenticated, createProduct);
  app.patch("/api/admin/products/:id", isSimpleAuthenticated, updateProduct);
  app.delete("/api/admin/products/:id", isSimpleAuthenticated, deleteProduct);
  app.get("/api/admin/products/:id/bom", isSimpleAuthenticated, getProductBom);
  app.put("/api/admin/products/:id/bom", isSimpleAuthenticated, updateProductBom);

  // Ingredients
  app.get("/api/admin/ingredients", isSimpleAuthenticated, getAllIngredients);
  app.post("/api/admin/ingredients", isSimpleAuthenticated, createIngredient);
  app.post("/api/admin/ingredients/seed", isSimpleAuthenticated, seedIngredients);
  app.patch("/api/admin/ingredients/:id", isSimpleAuthenticated, updateIngredient);
  app.post("/api/admin/ingredients/:id/adjust", isSimpleAuthenticated, adjustIngredientInventory);

  // Locations
  app.get("/api/admin/locations", isSimpleAuthenticated, getAllLocations);
  app.post("/api/admin/locations", isSimpleAuthenticated, createLocation);
  app.patch("/api/admin/locations/:id", isSimpleAuthenticated, updateLocation);
  app.get("/api/admin/locations/:id/inventory", isSimpleAuthenticated, getLocationInventory);

  // Batches
  app.get("/api/admin/batches", isSimpleAuthenticated, getAllBatches);
  app.post("/api/admin/batches", isSimpleAuthenticated, createBatch);
  app.patch("/api/admin/batches/:id/status", isSimpleAuthenticated, updateBatchStatus);

  // Invoices
  app.get("/api/admin/invoices", isSimpleAuthenticated, getAllInvoices);
  app.get("/api/admin/invoices/:id", isSimpleAuthenticated, getInvoice);
  app.patch("/api/admin/invoices/:id/status", isSimpleAuthenticated, updateInvoiceStatus);

  // Marketing
  app.get("/api/admin/marketing", isSimpleAuthenticated, getAllMarketingAssets);
  app.post("/api/admin/marketing", isSimpleAuthenticated, createMarketingAsset);

  // Stats
  app.get("/api/admin/stats/dashboard", isSimpleAuthenticated, getDashboardStats);
  app.get("/api/admin/stats/orders", isSimpleAuthenticated, getOrderStats);
  app.get("/api/admin/stats/inventory", isSimpleAuthenticated, getInventoryStats);
  app.get("/api/admin/stats/freezer", isSimpleAuthenticated, getFreezerStats);

  // Freezer Stock
  app.get("/api/admin/freezer", isSimpleAuthenticated, getFreezerStock);
  app.get("/api/admin/freezer/product/:productId", isSimpleAuthenticated, getFreezerStockByProduct);
  app.post("/api/admin/freezer", isSimpleAuthenticated, createFreezerStock);
  app.post("/api/admin/freezer/seed", isSimpleAuthenticated, seedFreezerStock);
  app.patch("/api/admin/freezer/:id", isSimpleAuthenticated, updateFreezerStock);

  // Activity Logs
  app.get("/api/admin/activity", isSimpleAuthenticated, getActivityLogs);
  app.get("/api/admin/activity/recent", isSimpleAuthenticated, getRecentActivity);

  // Inventory Adjustments
  app.get("/api/admin/inventory-adjustments", isSimpleAuthenticated, getInventoryAdjustments);
  app.post("/api/admin/inventory-adjustments", isSimpleAuthenticated, async (req, res) => {
    try {
      const adjustmentSchema = z.object({
        ingredientId: z.string().min(1),
        adjustmentType: z.enum(["receive", "waste", "correction", "production"]),
        quantity: z.number(),
        reason: z.string().optional(),
      });

      const parseResult = adjustmentSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid adjustment data",
          errors: parseResult.error.errors 
        });
      }

      const { ingredientId, adjustmentType, quantity, reason } = parseResult.data;
      const adjustment = await storage.adjustIngredientInventory(
        ingredientId,
        quantity,
        adjustmentType,
        reason,
        "admin"
      );

      await storage.logActivity(
        "ingredient.adjusted",
        "ingredient",
        ingredientId,
        { adjustmentType, quantity, reason },
        undefined,
        "admin"
      );

      res.json(adjustment);
    } catch (error: any) {
      console.error("Error creating adjustment:", error);
      res.status(500).json({ message: error.message || "Failed to create adjustment" });
    }
  });

  // ==========================================
  // WEBHOOKS
  // ==========================================
  app.post("/api/webhooks/stripe", async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res.json({ received: true });
    }

    try {
      const event = getStripe().webhooks.constructEvent(
        req.body,
        sig as string,
        webhookSecret
      );

      switch (event.type) {
        case "payment_intent.payment_failed": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const orders = await storage.getOrders();
          const order = orders.find(o => o.stripePaymentIntentId === paymentIntent.id);
          if (order) {
            await storage.updateOrder(order.id, { stripePaymentStatus: "failed" });
          }
          break;
        }
        case "payment_intent.canceled": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const orders = await storage.getOrders();
          const order = orders.find(o => o.stripePaymentIntentId === paymentIntent.id);
          if (order && order.status === "new") {
            await storage.updateOrderStatus(order.id, "cancelled");
            await storage.updateOrder(order.id, { stripePaymentStatus: "cancelled" });
          }
          break;
        }
      }

      res.json({ received: true });
    } catch (err: any) {
      console.error("Webhook error:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });

  return httpServer;
}
