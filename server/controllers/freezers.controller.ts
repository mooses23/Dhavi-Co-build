import type { Request, Response } from "express";
import { storage } from "../storage.js";
import { insertFreezerSchema } from "../../shared/schema.js";
import { z } from "zod";

export async function getFreezers(req: Request, res: Response) {
  try {
    const freezers = await storage.getFreezers();
    
    const formattedFreezer = freezers.map(freezer => ({
      id: freezer.id,
      name: freezer.name,
      createdAt: freezer.createdAt,
      stock: freezer.stock.map(item => ({
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
      })),
    }));
    
    res.json({ freezers: formattedFreezer });
  } catch (error) {
    console.error("Error fetching freezers:", error);
    res.status(500).json({ message: "Failed to fetch freezers" });
  }
}

export async function createFreezer(req: Request, res: Response) {
  try {
    const parseResult = insertFreezerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        message: "Invalid freezer data",
        errors: parseResult.error.errors 
      });
    }
    const freezer = await storage.createFreezer(parseResult.data);
    res.json(freezer);
  } catch (error) {
    console.error("Error creating freezer:", error);
    res.status(500).json({ message: "Failed to create freezer" });
  }
}

export async function updateFreezer(req: Request, res: Response) {
  try {
    const updateSchema = insertFreezerSchema.partial();
    const parseResult = updateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        message: "Invalid freezer data",
        errors: parseResult.error.errors 
      });
    }
    const freezer = await storage.updateFreezer(req.params.id as string, parseResult.data);
    res.json(freezer);
  } catch (error) {
    console.error("Error updating freezer:", error);
    res.status(500).json({ message: "Failed to update freezer" });
  }
}

export async function deleteFreezer(req: Request, res: Response) {
  try {
    await storage.deleteFreezer(req.params.id as string);
    res.json({ success: true, message: "Freezer deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting freezer:", error);
    if (error.message === "Cannot delete freezer with stock") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to delete freezer" });
  }
}

export async function addFreezerStock(req: Request, res: Response) {
  try {
    const stockSchema = z.object({
      productId: z.string().min(1),
      quantity: z.number().positive(),
    });
    
    const parseResult = stockSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        message: "Invalid stock data",
        errors: parseResult.error.errors 
      });
    }
    
    const { productId, quantity } = parseResult.data;
    const freezerId = req.params.freezerId as string;
    
    const stock = await storage.addOrUpdateFreezerStock(freezerId, productId, quantity);
    res.json(stock);
  } catch (error) {
    console.error("Error adding freezer stock:", error);
    res.status(500).json({ message: "Failed to add freezer stock" });
  }
}

export async function updateFreezerStock(req: Request, res: Response) {
  try {
    const quantitySchema = z.object({
      quantity: z.number().positive(),
    });
    
    const parseResult = quantitySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        message: "Invalid quantity data",
        errors: parseResult.error.errors 
      });
    }
    
    const { quantity } = parseResult.data;
    const freezerId = req.params.freezerId as string;
    const productId = req.params.productId as string;
    
    const stock = await storage.addOrUpdateFreezerStock(freezerId, productId, quantity);
    res.json(stock);
  } catch (error) {
    console.error("Error updating freezer stock:", error);
    res.status(500).json({ message: "Failed to update freezer stock" });
  }
}

export async function updateFreezerStockPerFreezer(req: Request, res: Response) {
  try {
    const quantitySchema = z.object({
      quantity: z.number().min(0),
    });
    
    const parseResult = quantitySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        message: "Invalid quantity data",
        errors: parseResult.error.errors 
      });
    }
    
    const { quantity } = parseResult.data;
    const freezerId = req.params.freezerId as string;
    const productId = req.params.productId as string;
    
    const stock = await storage.addOrUpdateFreezerStock(freezerId, productId, quantity);
    res.json(stock);
  } catch (error) {
    console.error("Error updating freezer stock:", error);
    res.status(500).json({ message: "Failed to update freezer stock" });
  }
}

export async function seedFreezers(req: Request, res: Response) {
  try {
    const existingFreezers = await storage.getFreezers();
    if (existingFreezers.length > 0) {
      return res.status(400).json({ 
        message: "Freezers already exist. Seed only works when no freezers exist." 
      });
    }

    const freezerNames = ["Freezer 1", "Freezer 2", "Freezer 3"];
    const createdFreezers = [];
    
    for (const name of freezerNames) {
      const freezer = await storage.createFreezer({ name });
      createdFreezers.push(freezer);
    }

    res.json({ 
      message: `Created ${createdFreezers.length} freezers`,
      freezers: createdFreezers 
    });
  } catch (error) {
    console.error("Error seeding freezers:", error);
    res.status(500).json({ message: "Failed to seed freezers" });
  }
}
