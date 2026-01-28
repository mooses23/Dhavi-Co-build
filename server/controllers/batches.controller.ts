import type { Request, Response } from "express";
import { storage } from "../storage.js";
import { batchCreateSchema, statusSchema } from "../lib/validation.js";

export async function getAllBatches(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as string | undefined;

    const allBatches = await storage.getBatches();
    
    let filteredBatches = allBatches;
    if (status && status !== "all") {
      filteredBatches = allBatches.filter(b => b.status === status);
    }

    const total = filteredBatches.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const batches = filteredBatches.slice(offset, offset + limit);

    res.json({
      batches,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching batches:", error);
    res.status(500).json({ message: "Failed to fetch batches" });
  }
}

export async function createBatch(req: Request, res: Response) {
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
}

export async function updateBatchStatus(req: Request, res: Response) {
  try {
    const parseResult = statusSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const { status } = parseResult.data;
    const batch = await storage.getBatch(req.params.id as string);
    
    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }

    if (status === "completed" && batch.status !== "completed") {
      const batchItems = await storage.getBatchItems(req.params.id as string);
      
      if (batchItems && batchItems.length > 0) {
        const deductions: { ingredientId: string; quantity: number }[] = [];
        
        for (const item of batchItems) {
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

        await storage.deductIngredients(deductions);

        const freezerItems = batchItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        }));
        await storage.addToFreezerFromBatch(req.params.id as string, freezerItems);

        await storage.logActivity(
          "batch.completed",
          "batch",
          req.params.id as string,
          { items: freezerItems, deductions },
          undefined,
          "admin"
        );
      }
    } else if (status === "in_progress") {
      await storage.logActivity(
        "batch.started",
        "batch",
        req.params.id as string,
        { shift: batch.shift },
        undefined,
        "admin"
      );
    }

    const updatedBatch = await storage.updateBatchStatus(req.params.id as string, status);
    res.json(updatedBatch);
  } catch (error) {
    console.error("Error updating batch status:", error);
    res.status(500).json({ message: "Failed to update batch status" });
  }
}
