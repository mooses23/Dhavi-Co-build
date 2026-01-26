import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import Stripe from "stripe";
import { z } from "zod";
import { insertIngredientSchema, insertProductSchema, insertLocationSchema, insertBatchSchema } from "@shared/schema";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

// Validation schemas
const orderCreateSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  locationId: z.string().min(1),
  fulfillmentDate: z.string(),
  fulfillmentWindow: z.string(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().min(1),
  })).min(1),
});

const batchCreateSchema = z.object({
  batchDate: z.string(),
  shift: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().min(0),
  })).optional(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication
  await setupAuth(app);
  registerAuthRoutes(app);

  // ==========================================
  // PUBLIC ROUTES (Customer-facing)
  // ==========================================

  // Get active products for ordering (public - only returns active products)
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      // Only return active products for public use
      const activeProducts = products.filter(p => p.isActive);
      res.json(activeProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Get active locations for ordering (public - only returns active locations)
  app.get("/api/locations", async (req, res) => {
    try {
      const locations = await storage.getLocations();
      // Only return active locations for public use
      const activeLocations = locations.filter(l => l.isActive);
      res.json(activeLocations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  // Create order (public)
  app.post("/api/orders", async (req, res) => {
    try {
      const parseResult = orderCreateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid order data", 
          errors: parseResult.error.errors 
        });
      }

      const {
        customerName,
        customerEmail,
        customerPhone,
        locationId,
        fulfillmentDate,
        fulfillmentWindow,
        items,
      } = parseResult.data;

      // Validate location exists and is active
      const location = await storage.getLocation(locationId);
      if (!location || !location.isActive) {
        return res.status(400).json({ message: "Invalid or inactive location" });
      }

      // Calculate totals
      let subtotal = 0;
      const orderItemsData = [];

      for (const item of items) {
        const product = await storage.getProduct(item.productId);
        if (!product || !product.isActive) {
          return res.status(400).json({ message: `Product not available: ${item.productId}` });
        }
        const unitPrice = parseFloat(product.price);
        const total = unitPrice * item.quantity;
        subtotal += total;
        orderItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: unitPrice.toFixed(2),
          total: total.toFixed(2),
        });
      }

      // Create Stripe PaymentIntent with manual capture
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(subtotal * 100), // cents
        currency: "usd",
        capture_method: "manual",
        metadata: {
          customerName,
          customerEmail,
        },
      });

      // Create order
      const order = await storage.createOrder({
        customerName,
        customerEmail,
        customerPhone,
        locationId,
        fulfillmentDate: new Date(fulfillmentDate),
        fulfillmentWindow,
        subtotal: subtotal.toFixed(2),
        total: subtotal.toFixed(2),
        stripePaymentIntentId: paymentIntent.id,
        stripePaymentStatus: "pending",
        status: "new",
      });

      // Create order items
      for (const itemData of orderItemsData) {
        await storage.createOrderItem({
          orderId: order.id,
          ...itemData,
        });
      }

      res.json({
        orderId: order.id,
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  // Get order by ID (public - for confirmation page)
  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      // Return limited info for public view
      res.json({
        id: order.id,
        status: order.status,
        total: order.total,
        fulfillmentDate: order.fulfillmentDate,
        fulfillmentWindow: order.fulfillmentWindow,
        location: { name: order.location.name },
        items: order.items.map(item => ({
          quantity: item.quantity,
          total: item.total,
          product: { name: item.product.name },
        })),
      });
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  // ==========================================
  // ADMIN ROUTES (Protected)
  // ==========================================

  // Admin: Get all orders (full data)
  app.get("/api/admin/orders", isAuthenticated, async (req, res) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Admin: Update order status
  app.patch("/api/admin/orders/:id/status", isAuthenticated, async (req, res) => {
    try {
      const statusSchema = z.object({ status: z.string().min(1) });
      const parseResult = statusSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const { status } = parseResult.data;
      const order = await storage.getOrder(req.params.id);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Handle payment actions based on status change
      if (status === "approved" && order.stripePaymentIntentId) {
        // Capture payment when approved
        try {
          await stripe.paymentIntents.capture(order.stripePaymentIntentId);
          await storage.updateOrder(order.id, { stripePaymentStatus: "captured" });
        } catch (stripeError: any) {
          console.error("Stripe capture error:", stripeError);
          return res.status(400).json({ 
            message: "Failed to capture payment",
            error: stripeError.message 
          });
        }
      } else if (status === "cancelled" && order.stripePaymentIntentId && order.stripePaymentStatus !== "captured") {
        // Cancel authorization if not yet captured
        try {
          await stripe.paymentIntents.cancel(order.stripePaymentIntentId);
          await storage.updateOrder(order.id, { stripePaymentStatus: "cancelled" });
        } catch (stripeError) {
          console.error("Stripe cancel error:", stripeError);
        }
      }

      const updatedOrder = await storage.updateOrderStatus(req.params.id, status);
      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Admin: Get all products (including inactive)
  app.get("/api/admin/products", isAuthenticated, async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Admin: Create product
  app.post("/api/admin/products", isAuthenticated, async (req, res) => {
    try {
      const { bom, ...productData } = req.body;
      const parseResult = insertProductSchema.safeParse(productData);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid product data",
          errors: parseResult.error.errors 
        });
      }

      const product = await storage.createProduct(parseResult.data);
      
      // Create bill of materials
      if (bom && Array.isArray(bom) && bom.length > 0) {
        for (const item of bom) {
          if (item.ingredientId && item.quantity > 0) {
            await storage.createBom({
              productId: product.id,
              ingredientId: item.ingredientId,
              quantity: item.quantity.toString(),
            });
          }
        }
      }
      
      res.json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  // Admin: Update product
  app.patch("/api/admin/products/:id", isAuthenticated, async (req, res) => {
    try {
      const updateSchema = insertProductSchema.partial();
      const parseResult = updateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid product data",
          errors: parseResult.error.errors 
        });
      }
      const product = await storage.updateProduct(req.params.id, parseResult.data);
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  // Admin: Get all ingredients
  app.get("/api/admin/ingredients", isAuthenticated, async (req, res) => {
    try {
      const ingredients = await storage.getIngredients();
      res.json(ingredients);
    } catch (error) {
      console.error("Error fetching ingredients:", error);
      res.status(500).json({ message: "Failed to fetch ingredients" });
    }
  });

  // Admin: Create ingredient
  app.post("/api/admin/ingredients", isAuthenticated, async (req, res) => {
    try {
      const parseResult = insertIngredientSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid ingredient data",
          errors: parseResult.error.errors 
        });
      }
      const ingredient = await storage.createIngredient(parseResult.data);
      res.json(ingredient);
    } catch (error) {
      console.error("Error creating ingredient:", error);
      res.status(500).json({ message: "Failed to create ingredient" });
    }
  });

  // Admin: Update ingredient
  app.patch("/api/admin/ingredients/:id", isAuthenticated, async (req, res) => {
    try {
      const updateSchema = insertIngredientSchema.partial();
      const parseResult = updateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid ingredient data",
          errors: parseResult.error.errors 
        });
      }
      const ingredient = await storage.updateIngredient(req.params.id, parseResult.data);
      res.json(ingredient);
    } catch (error) {
      console.error("Error updating ingredient:", error);
      res.status(500).json({ message: "Failed to update ingredient" });
    }
  });

  // Admin: Get all locations (including inactive)
  app.get("/api/admin/locations", isAuthenticated, async (req, res) => {
    try {
      const locations = await storage.getLocations();
      res.json(locations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  // Admin: Create location
  app.post("/api/admin/locations", isAuthenticated, async (req, res) => {
    try {
      const parseResult = insertLocationSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid location data",
          errors: parseResult.error.errors 
        });
      }
      const location = await storage.createLocation(parseResult.data);
      res.json(location);
    } catch (error) {
      console.error("Error creating location:", error);
      res.status(500).json({ message: "Failed to create location" });
    }
  });

  // Admin: Update location
  app.patch("/api/admin/locations/:id", isAuthenticated, async (req, res) => {
    try {
      const updateSchema = insertLocationSchema.partial();
      const parseResult = updateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid location data",
          errors: parseResult.error.errors 
        });
      }
      const location = await storage.updateLocation(req.params.id, parseResult.data);
      res.json(location);
    } catch (error) {
      console.error("Error updating location:", error);
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  // Admin: Get all batches
  app.get("/api/admin/batches", isAuthenticated, async (req, res) => {
    try {
      const batches = await storage.getBatches();
      res.json(batches);
    } catch (error) {
      console.error("Error fetching batches:", error);
      res.status(500).json({ message: "Failed to fetch batches" });
    }
  });

  // Admin: Create batch
  app.post("/api/admin/batches", isAuthenticated, async (req, res) => {
    try {
      const parseResult = batchCreateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid batch data",
          errors: parseResult.error.errors 
        });
      }

      const { items, ...batchData } = parseResult.data;
      const batch = await storage.createBatch({
        ...batchData,
        batchDate: new Date(batchData.batchDate),
      });

      // Create batch items
      if (items && items.length > 0) {
        for (const item of items) {
          if (item.quantity > 0) {
            await storage.createBatchItem({
              batchId: batch.id,
              productId: item.productId,
              quantity: item.quantity,
            });
          }
        }
      }

      res.json(batch);
    } catch (error) {
      console.error("Error creating batch:", error);
      res.status(500).json({ message: "Failed to create batch" });
    }
  });

  // Admin: Update batch status
  app.patch("/api/admin/batches/:id/status", isAuthenticated, async (req, res) => {
    try {
      const statusSchema = z.object({ status: z.string().min(1) });
      const parseResult = statusSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const { status } = parseResult.data;
      const batch = await storage.getBatch(req.params.id);
      
      if (!batch) {
        return res.status(404).json({ message: "Batch not found" });
      }

      // When completing a batch, deduct ingredients based on BOM
      if (status === "completed" && batch.status !== "completed") {
        // Get batch items directly
        const batchItems = await storage.getBatchItems(req.params.id);
        
        if (batchItems && batchItems.length > 0) {
          const deductions: { ingredientId: string; quantity: number }[] = [];
          
          for (const item of batchItems) {
            // Get BOM for this product
            const bom = await storage.getBomForProduct(item.productId);
            
            for (const bomItem of bom) {
              const quantityNeeded = parseFloat(bomItem.quantity) * item.quantity;
              const existing = deductions.find(d => d.ingredientId === bomItem.ingredientId);
              if (existing) {
                existing.quantity += quantityNeeded;
              } else {
                deductions.push({
                  ingredientId: bomItem.ingredientId,
                  quantity: quantityNeeded,
                });
              }
            }
          }

          // Check if we have enough ingredients
          for (const deduction of deductions) {
            const ingredient = await storage.getIngredient(deduction.ingredientId);
            if (!ingredient) {
              return res.status(400).json({ 
                message: `Ingredient not found: ${deduction.ingredientId}` 
              });
            }
            if (parseFloat(ingredient.onHand) < deduction.quantity) {
              return res.status(400).json({ 
                message: `Insufficient ${ingredient.name}: need ${deduction.quantity.toFixed(2)}, have ${ingredient.onHand}` 
              });
            }
          }

          // Deduct ingredients
          await storage.deductIngredients(deductions);
        }
      }

      const updatedBatch = await storage.updateBatchStatus(req.params.id, status);
      res.json(updatedBatch);
    } catch (error) {
      console.error("Error updating batch status:", error);
      res.status(500).json({ message: "Failed to update batch status" });
    }
  });

  // Admin: Dashboard stats
  app.get("/api/admin/stats/dashboard", isAuthenticated, async (req, res) => {
    try {
      const orders = await storage.getOrders();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayOrders = orders.filter(o => new Date(o.createdAt!) >= today);
      const pendingOrders = orders.filter(o => o.status === "new");
      const approvedToday = todayOrders.filter(o => o.status !== "new" && o.status !== "cancelled");
      const todayRevenue = approvedToday.reduce((sum, o) => sum + parseFloat(o.total), 0);

      const ingredients = await storage.getIngredients();
      const lowStockCount = ingredients.filter(
        i => parseFloat(i.onHand) <= parseFloat(i.reorderThreshold)
      ).length;

      res.json({
        todayOrders: todayOrders.length,
        pendingOrders: pendingOrders.length,
        todayRevenue,
        lowStockCount,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Stripe Webhook (for payment status reconciliation)
  app.post("/api/webhooks/stripe", async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // If no webhook secret, just acknowledge
    if (!webhookSecret) {
      return res.json({ received: true });
    }

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig as string,
        webhookSecret
      );

      switch (event.type) {
        case "payment_intent.payment_failed": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          // Find and update order
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
