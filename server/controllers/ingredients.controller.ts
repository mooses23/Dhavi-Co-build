import type { Request, Response } from "express";
import { storage } from "../storage.js";
import { insertIngredientSchema } from "../../shared/schema.js";
import { z } from "zod";

export async function getAllIngredients(req: Request, res: Response) {
  try {
    const ingredients = await storage.getIngredients();
    res.json(ingredients);
  } catch (error) {
    console.error("Error fetching ingredients:", error);
    res.status(500).json({ message: "Failed to fetch ingredients" });
  }
}

export async function createIngredient(req: Request, res: Response) {
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
}

export async function updateIngredient(req: Request, res: Response) {
  try {
    const updateSchema = insertIngredientSchema.partial();
    const parseResult = updateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        message: "Invalid ingredient data",
        errors: parseResult.error.errors 
      });
    }
    const ingredient = await storage.updateIngredient(req.params.id as string, parseResult.data);
    res.json(ingredient);
  } catch (error) {
    console.error("Error updating ingredient:", error);
    res.status(500).json({ message: "Failed to update ingredient" });
  }
}

export async function getInventoryAdjustments(req: Request, res: Response) {
  try {
    const ingredientId = req.query.ingredientId as string | undefined;
    const adjustments = await storage.getInventoryAdjustments(ingredientId);
    res.json(adjustments);
  } catch (error) {
    console.error("Error fetching inventory adjustments:", error);
    res.status(500).json({ message: "Failed to fetch inventory adjustments" });
  }
}

export async function adjustIngredientInventory(req: Request, res: Response) {
  try {
    const adjustSchema = z.object({
      quantity: z.number(),
      type: z.string().min(1),
      reason: z.string().optional(),
    });
    
    const parseResult = adjustSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        message: "Invalid adjustment data",
        errors: parseResult.error.errors 
      });
    }

    const { quantity, type, reason } = parseResult.data;
    const adjustment = await storage.adjustIngredientInventory(
      req.params.id as string,
      quantity,
      type,
      reason,
      "admin"
    );
    res.json(adjustment);
  } catch (error) {
    console.error("Error adjusting ingredient inventory:", error);
    res.status(500).json({ message: "Failed to adjust ingredient inventory" });
  }
}

const basicBakeryIngredients = [
  { name: "Spelt Flour", unit: "lb", onHand: "100", reorderThreshold: "20" },
  { name: "Sea Salt", unit: "lb", onHand: "10", reorderThreshold: "2" },
  { name: "Olive Oil", unit: "gallon", onHand: "5", reorderThreshold: "1" },
  { name: "Honey", unit: "gallon", onHand: "3", reorderThreshold: "0.5" },
  { name: "Yeast", unit: "lb", onHand: "2", reorderThreshold: "0.5" },
  { name: "Sesame Seeds", unit: "lb", onHand: "5", reorderThreshold: "1" },
  { name: "Poppy Seeds", unit: "lb", onHand: "3", reorderThreshold: "0.5" },
  { name: "Everything Seasoning", unit: "lb", onHand: "4", reorderThreshold: "1" },
  { name: "Cornmeal", unit: "lb", onHand: "10", reorderThreshold: "2" },
  { name: "Bagel Bags", unit: "count", onHand: "500", reorderThreshold: "100" },
];

export async function seedIngredients(req: Request, res: Response) {
  try {
    const existingIngredients = await storage.getIngredients();
    if (existingIngredients.length > 0) {
      return res.status(400).json({ message: "Pantry already has ingredients. Seed only works on empty pantry." });
    }

    const createdIngredients = [];
    for (const ingredient of basicBakeryIngredients) {
      const created = await storage.createIngredient(ingredient);
      createdIngredients.push(created);
    }

    res.json({ 
      message: "Pantry stocked with basic bakery ingredients",
      ingredients: createdIngredients 
    });
  } catch (error) {
    console.error("Error seeding ingredients:", error);
    res.status(500).json({ message: "Failed to seed ingredients" });
  }
}
