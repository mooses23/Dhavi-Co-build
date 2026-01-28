import type { Request, Response } from "express";
import { storage } from "../storage.js";
import { z } from "zod";

export async function getFreezerStock(req: Request, res: Response) {
  try {
    const stock = await storage.getFreezerStock();
    res.json(stock);
  } catch (error) {
    console.error("Error fetching freezer stock:", error);
    res.status(500).json({ message: "Failed to fetch freezer stock" });
  }
}

export async function getFreezerStockByProduct(req: Request, res: Response) {
  try {
    const stock = await storage.getFreezerStockByProduct(req.params.productId as string);
    res.json(stock);
  } catch (error) {
    console.error("Error fetching product freezer stock:", error);
    res.status(500).json({ message: "Failed to fetch product freezer stock" });
  }
}

export async function createFreezerStock(req: Request, res: Response) {
  try {
    const schema = z.object({
      productId: z.string().min(1),
      quantity: z.number().int().min(1),
      batchId: z.string().optional(),
      notes: z.string().optional(),
      expiresAt: z.string().optional(),
    });

    const parseResult = schema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        message: "Invalid freezer stock data",
        errors: parseResult.error.errors 
      });
    }

    const data = parseResult.data;

    const products = await storage.getProducts();
    const product = products.find(p => p.id === data.productId);
    if (!product) {
      return res.status(400).json({ message: "Product not found" });
    }

    const stock = await storage.createFreezerStock({
      productId: data.productId,
      quantity: data.quantity,
      batchId: data.batchId,
      notes: data.notes,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    });

    await storage.logActivity(
      "freezer.stocked",
      "freezer_stock",
      stock.id,
      { productId: data.productId, quantity: data.quantity },
      undefined,
      "admin"
    );

    res.json(stock);
  } catch (error) {
    console.error("Error creating freezer stock:", error);
    res.status(500).json({ message: "Failed to create freezer stock" });
  }
}

export async function updateFreezerStock(req: Request, res: Response) {
  try {
    const schema = z.object({
      quantity: z.number().int().min(0),
    });

    const parseResult = schema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid quantity" });
    }

    const stock = await storage.updateFreezerStock(req.params.id as string, parseResult.data.quantity);
    if (!stock) {
      return res.status(404).json({ message: "Freezer stock not found" });
    }

    res.json(stock);
  } catch (error) {
    console.error("Error updating freezer stock:", error);
    res.status(500).json({ message: "Failed to update freezer stock" });
  }
}

export async function getFreezerStats(req: Request, res: Response) {
  try {
    const stock = await storage.getFreezerStock();
    
    const productStats = stock.reduce((acc, item) => {
      const key = item.productId;
      const productName = item.product?.name || "Unknown Product";
      if (!acc[key]) {
        acc[key] = {
          productId: item.productId,
          productName,
          totalQuantity: 0,
          batches: 0,
        };
      }
      acc[key].totalQuantity += item.quantity;
      acc[key].batches += 1;
      return acc;
    }, {} as Record<string, { productId: string; productName: string; totalQuantity: number; batches: number }>);

    res.json({
      totalItems: stock.reduce((sum, item) => sum + item.quantity, 0),
      uniqueProducts: Object.keys(productStats).length,
      productBreakdown: Object.values(productStats),
    });
  } catch (error) {
    console.error("Error fetching freezer stats:", error);
    res.status(500).json({ message: "Failed to fetch freezer stats" });
  }
}
